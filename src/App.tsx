import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { PARTNER_PERSONAS, SCENARIOS } from './data/scenarios';
import {
  AppView,
  HskLevel,
  KeyPhrase,
  PartnerPersona,
  PracticeMode,
  SavedConversation,
  SavedPhrase,
  Scenario,
  SpeakingPace,
  SuggestedReply,
  TranscriptTurn,
  VoiceName,
} from './types';
import {
  chatReplyApi,
  deleteConversationApi,
  deletePhraseApi,
  enrichTurnApi,
  generateReviewApi,
  listConversationsApi,
  listVocabularyApi,
  saveConversationApi,
  savePhraseApi,
  suggestRepliesApi,
  synthesizeTtsApi,
  updateConversationApi,
  updatePhraseApi,
} from './services/api';
import { useLiveMandarin } from './hooks/useLiveMandarin';
import { playWavBase64, stopWavPlayback } from './utils/audio';
import { TopBar } from './components/TopBar';
import { PracticeStudio } from './components/PracticeStudio';
import { ScenarioHub } from './components/ScenarioHub';
import { SavedConversations } from './components/SavedConversations';
import { VocabularyNotebook } from './components/VocabularyNotebook';

export default function App() {
  const [activeView, setActiveView] = useState<AppView>('practice');
  const [scenarios, setScenarios] = useState<Scenario[]>(SCENARIOS);
  const [activeScenario, setActiveScenario] = useState<Scenario>(SCENARIOS[0]);
  const [partner, setPartner] = useState<PartnerPersona>(PARTNER_PERSONAS[0]);
  const [level, setLevel] = useState<HskLevel>('HSK 3–4');
  const [pace, setPace] = useState<SpeakingPace>('natural');
  const [mode, setMode] = useState<PracticeMode>('voice');

  // Active conversation state
  const [turns, setTurns] = useState<TranscriptTurn[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string>(() => `conv_${Date.now()}`);
  const [sessionCreatedAt, setSessionCreatedAt] = useState<number>(() => Date.now());
  const [savedConversationId, setSavedConversationId] = useState<string | null>(null);
  const [isSavingConversation, setIsSavingConversation] = useState(false);
  const [isTextReplying, setIsTextReplying] = useState(false);

  // Suggestions & TTS playback
  const [suggestions, setSuggestions] = useState<SuggestedReply[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [playingTtsKey, setPlayingTtsKey] = useState<string | null>(null);

  // Persistent saved conversations & vocabulary
  const [savedConversations, setSavedConversations] = useState<SavedConversation[]>([]);
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [selectedSavedId, setSelectedSavedId] = useState<string | null>(null);

  const [vocabulary, setVocabulary] = useState<SavedPhrase[]>([]);
  const [loadingVocabulary, setLoadingVocabulary] = useState(true);

  // Quiet status banner toast
  const [toast, setToast] = useState<{ text: string; tone: 'ok' | 'error' } | null>(null);

  const turnsRef = useRef<TranscriptTurn[]>(turns);
  const scenarioRef = useRef<Scenario>(activeScenario);
  const levelRef = useRef<HskLevel>(level);

  useEffect(() => {
    turnsRef.current = turns;
  }, [turns]);

  useEffect(() => {
    scenarioRef.current = activeScenario;
  }, [activeScenario]);

  useEffect(() => {
    levelRef.current = level;
  }, [level]);

  const showToast = useCallback((text: string, tone: 'ok' | 'error' = 'ok') => {
    setToast({ text, tone });
  }, []);

  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(null), 3600);
    return () => window.clearTimeout(id);
  }, [toast]);

  // Load persisted conversations & vocabulary on mount
  useEffect(() => {
    listConversationsApi()
      .then((res) => setSavedConversations(res.conversations))
      .catch(() => {})
      .finally(() => setLoadingConversations(false));

    listVocabularyApi()
      .then((res) => setVocabulary(res.vocabulary))
      .catch(() => {})
      .finally(() => setLoadingVocabulary(false));
  }, []);

  const savedPhraseSet = useMemo(
    () => new Set(vocabulary.map((v) => v.hanzi.trim())),
    [vocabulary]
  );

  // Commit spoken live turn and enrich asynchronously with Pinyin + Vietnamese + Naturalness coaching
  const handleTurnCommitted = useCallback((role: 'user' | 'assistant', rawText: string) => {
    const cleaned = rawText.trim();
    if (!cleaned) return;

    const turnId = `turn_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const optimisticTurn: TranscriptTurn = {
      id: turnId,
      role,
      hanzi: cleaned,
      timestamp: Date.now(),
      enriching: true,
    };

    const recentHistory = turnsRef.current.slice(-4).map((t) => ({
      role: t.role,
      hanzi: t.hanzi,
    }));

    setTurns((prev) => [...prev, optimisticTurn]);

    enrichTurnApi({
      role,
      text: cleaned,
      scenarioTitle: scenarioRef.current.title,
      level: levelRef.current,
      recentHistory,
    })
      .then((enriched) => {
        setTurns((prev) =>
          prev.map((t) =>
            t.id === turnId
              ? {
                  ...t,
                  hanzi: enriched.hanzi || t.hanzi,
                  pinyin: enriched.pinyin,
                  vietnamese: enriched.vietnamese,
                  feedback: enriched.feedback,
                  keyPhrases: enriched.keyPhrases,
                  enriching: false,
                }
              : t
          )
        );
      })
      .catch(() => {
        setTurns((prev) =>
          prev.map((t) => (t.id === turnId ? { ...t, enriching: false } : t))
        );
      });
  }, []);

  const live = useLiveMandarin({ onTurnCommitted: handleTurnCommitted });

  const handlePlayTts = useCallback(
    async (key: string, text: string, slow = false, voiceOverride?: VoiceName) => {
      if (!text.trim()) return;
      stopWavPlayback();
      setPlayingTtsKey(key);
      try {
        const { audioBase64 } = await synthesizeTtsApi({
          text,
          voiceName: voiceOverride || partner.voiceName,
          slow,
        });
        await playWavBase64(audioBase64);
      } catch (err: any) {
        showToast(err?.message || 'Không thể phát âm thanh mẫu.', 'error');
      } finally {
        setPlayingTtsKey((curr) => (curr === key ? null : curr));
      }
    },
    [partner.voiceName, showToast]
  );

  const handleStartVoice = useCallback(() => {
    stopWavPlayback();
    live.startSession({
      scenario: activeScenario,
      partner,
      level,
      pace,
      autoGreet: turns.length === 0,
    });
  }, [activeScenario, level, live, pace, partner, turns.length]);

  const handleChangeMode = useCallback(
    (nextMode: PracticeMode) => {
      if (nextMode === mode) return;
      if (live.status === 'connected' || live.status === 'connecting') {
        live.stopSession();
      }
      setMode(nextMode);
    },
    [live, mode]
  );

  const handleSendMessage = useCallback(
    async (text: string) => {
      const cleaned = text.trim();
      if (!cleaned) return;

      // If live voice call is connected, send text directly into the Gemini 3.8 Live session
      if (mode === 'voice' && live.status === 'connected') {
        live.sendLiveTextCue(cleaned, cleaned !== '__START_CONVERSATION__');
        setSuggestions([]);
        return;
      }

      // Switch smoothly into text+audio mode if user types while voice is idle
      if (mode === 'voice' && live.status !== 'connected') {
        setMode('text');
      }

      const isGreeting = cleaned === '__START_CONVERSATION__';
      const userTurnId = `turn_${Date.now()}_u`;

      if (!isGreeting) {
        setTurns((prev) => [
          ...prev,
          {
            id: userTurnId,
            role: 'user',
            hanzi: cleaned,
            timestamp: Date.now(),
            enriching: true,
          },
        ]);
      }

      setIsTextReplying(true);
      setSuggestions([]);

      try {
        const historyPayload = turnsRef.current.map((t) => ({
          role: t.role,
          hanzi: t.hanzi,
        }));

        const data = await chatReplyApi({
          message: cleaned,
          history: historyPayload,
          scenarioTitle: `${activeScenario.title} (${activeScenario.hanziTitle})`,
          partnerRole: activeScenario.partnerRole,
          userRole: activeScenario.userRole,
          partnerName: partner.hanziName,
          level,
        });

        const assistantTurnId = `turn_${Date.now()}_a`;

        setTurns((prev) => {
          const updated = isGreeting
            ? prev
            : prev.map((t) =>
                t.id === userTurnId && data.userEnrichment
                  ? {
                      ...t,
                      hanzi: data.userEnrichment.hanzi || t.hanzi,
                      pinyin: data.userEnrichment.pinyin,
                      vietnamese: data.userEnrichment.vietnamese,
                      feedback: data.userEnrichment.feedback,
                      enriching: false,
                    }
                  : t
              );

          return [
            ...updated,
            {
              id: assistantTurnId,
              role: 'assistant',
              hanzi: data.assistantReply.hanzi,
              pinyin: data.assistantReply.pinyin,
              vietnamese: data.assistantReply.vietnamese,
              keyPhrases: data.assistantReply.keyPhrases,
              timestamp: Date.now(),
              enriching: false,
            },
          ];
        });

        // Auto-play partner voice in Text & Audio mode for natural listening immersion
        if (data.assistantReply?.hanzi) {
          handlePlayTts(`${assistantTurnId}_normal`, data.assistantReply.hanzi, pace === 'slow');
        }
      } catch (err: any) {
        if (!isGreeting) {
          setTurns((prev) =>
            prev.map((t) => (t.id === userTurnId ? { ...t, enriching: false } : t))
          );
        }
        showToast(err?.message || 'Không thể nhận phản hồi từ đối tác.', 'error');
      } finally {
        setIsTextReplying(false);
      }
    },
    [activeScenario, handlePlayTts, level, live, mode, pace, partner.hanziName, showToast]
  );

  const handleRequestSuggestions = useCallback(async () => {
    setIsLoadingSuggestions(true);
    try {
      const res = await suggestRepliesApi({
        history: turnsRef.current.map((t) => ({ role: t.role, hanzi: t.hanzi })),
        scenarioTitle: `${activeScenario.title} (${activeScenario.hanziTitle})`,
        level,
      });
      setSuggestions(res.suggestions || []);
    } catch (err: any) {
      showToast(err?.message || 'Không thể tải gợi ý lúc này.', 'error');
    } finally {
      setIsLoadingSuggestions(false);
    }
  }, [activeScenario.hanziTitle, activeScenario.title, level, showToast]);

  const handleSaveConversation = useCallback(
    async (withReview = true) => {
      if (turnsRef.current.length === 0) return;
      setIsSavingConversation(true);
      try {
        let review = savedConversations.find((c) => c.id === currentSessionId)?.review;
        let autoTitle = `${activeScenario.title} · ${new Date(sessionCreatedAt).toLocaleDateString('vi-VN')}`;

        if (withReview) {
          try {
            const res = await generateReviewApi({
              turns: turnsRef.current,
              scenarioTitle: activeScenario.title,
              level,
            });
            review = res.review;
            if (res.review?.title) {
              autoTitle = res.review.title;
            }
          } catch {
            // Still save transcript cleanly even if review generation fails transiently
          }
        }

        const record: SavedConversation = {
          id: currentSessionId,
          title: autoTitle,
          scenarioId: activeScenario.id,
          scenarioTitle: activeScenario.title,
          scenarioHanziTitle: activeScenario.hanziTitle,
          level,
          partnerName: `${partner.name} (${partner.hanziName})`,
          voiceName: partner.voiceName,
          mode,
          durationSeconds: live.elapsedSeconds,
          createdAt: sessionCreatedAt,
          updatedAt: Date.now(),
          turns: turnsRef.current.map((t) => ({ ...t, enriching: false })),
          review,
        };

        const { conversation } = await saveConversationApi(record);
        setSavedConversationId(conversation.id);
        setSelectedSavedId(conversation.id);
        setSavedConversations((prev) => {
          const exists = prev.some((c) => c.id === conversation.id);
          return exists
            ? prev.map((c) => (c.id === conversation.id ? conversation : c))
            : [conversation, ...prev];
        });
        showToast('Đã lưu cuộc hội thoại kèm bản tổng kết luyện tập.');
      } catch (err: any) {
        showToast(err?.message || 'Không thể lưu hội thoại.', 'error');
      } finally {
        setIsSavingConversation(false);
      }
    },
    [
      activeScenario.hanziTitle,
      activeScenario.id,
      activeScenario.title,
      currentSessionId,
      level,
      live.elapsedSeconds,
      mode,
      partner.hanziName,
      partner.name,
      partner.voiceName,
      savedConversations,
      sessionCreatedAt,
      showToast,
    ]
  );

  const handleSavePhrase = useCallback(
    async (phrase: KeyPhrase, scenarioTitleOverride?: string) => {
      try {
        const res = await savePhraseApi({
          hanzi: phrase.hanzi,
          pinyin: phrase.pinyin,
          vietnamese: phrase.vietnamese,
          usage: phrase.usage,
          scenarioTitle: scenarioTitleOverride || activeScenario.title,
        });
        if (!res.duplicate) {
          setVocabulary((prev) => [res.phrase, ...prev]);
          showToast(`Đã lưu "${phrase.hanzi}" vào sổ từ vựng.`);
        } else {
          showToast(`"${phrase.hanzi}" đã có trong sổ từ vựng.`);
        }
      } catch (err: any) {
        showToast(err?.message || 'Không thể lưu từ vựng.', 'error');
      }
    },
    [activeScenario.title, showToast]
  );

  const resetSessionForScenario = useCallback(
    (scene: Scenario, targetLevel?: HskLevel) => {
      if (live.status === 'connected' || live.status === 'connecting') {
        live.stopSession();
      }
      stopWavPlayback();
      setActiveScenario(scene);
      if (targetLevel) setLevel(targetLevel);
      setTurns([]);
      setSuggestions([]);
      setCurrentSessionId(`conv_${Date.now()}`);
      setSessionCreatedAt(Date.now());
      setSavedConversationId(null);
      live.clearError();
      setActiveView('practice');
    },
    [live]
  );

  const handleStartFreshSession = useCallback(() => {
    resetSessionForScenario(activeScenario);
  }, [activeScenario, resetSessionForScenario]);

  const handleGenerateReviewForSaved = useCallback(
    async (conv: SavedConversation) => {
      try {
        const { review } = await generateReviewApi({
          turns: conv.turns,
          scenarioTitle: conv.scenarioTitle,
          level: conv.level,
        });
        const { conversation } = await updateConversationApi(conv.id, {
          review,
          title: conv.title || review.title,
        });
        setSavedConversations((prev) =>
          prev.map((c) => (c.id === conversation.id ? conversation : c))
        );
        showToast('Đã cập nhật tổng kết diễn đạt bản xứ.');
      } catch (err: any) {
        showToast(err?.message || 'Không thể tạo tổng kết.', 'error');
      }
    },
    [showToast]
  );

  const handleUpdateSavedConversation = useCallback(
    async (id: string, patch: Partial<SavedConversation>) => {
      try {
        const { conversation } = await updateConversationApi(id, patch);
        setSavedConversations((prev) =>
          prev.map((c) => (c.id === conversation.id ? conversation : c))
        );
        showToast('Đã cập nhật ghi chú hội thoại.');
      } catch (err: any) {
        showToast(err?.message || 'Không thể cập nhật hội thoại.', 'error');
      }
    },
    [showToast]
  );

  const handleDeleteSavedConversation = useCallback(
    async (id: string) => {
      try {
        await deleteConversationApi(id);
        setSavedConversations((prev) => prev.filter((c) => c.id !== id));
        if (savedConversationId === id) setSavedConversationId(null);
        showToast('Đã xóa cuộc hội thoại.');
      } catch (err: any) {
        showToast(err?.message || 'Không thể xóa hội thoại.', 'error');
      }
    },
    [savedConversationId, showToast]
  );

  const handlePracticeAgainFromSaved = useCallback(
    (conv: SavedConversation) => {
      const matched = scenarios.find((s) => s.id === conv.scenarioId);
      if (matched) {
        resetSessionForScenario(matched, conv.level);
      } else {
        const rebuilt: Scenario = {
          id: conv.scenarioId,
          title: conv.scenarioTitle,
          hanziTitle: conv.scenarioHanziTitle,
          category: 'Ôn luyện lại',
          recommendedLevel: conv.level,
          description: 'Luyện lại tình huống đã lưu để phản xạ trôi chảy và tự nhiên hơn.',
          partnerRole: 'Người bản xứ Trung Quốc thân thiện, trò chuyện tự nhiên theo tình huống.',
          userRole: 'Người học tiếng Trung ôn luyện giao tiếp tự nhiên.',
          openingGoal: 'Áp dụng lại các mẫu câu tự nhiên đã rút ra từ buổi luyện trước.',
          starterPhrases: SCENARIOS[0].starterPhrases,
        };
        resetSessionForScenario(rebuilt, conv.level);
      }
    },
    [resetSessionForScenario, scenarios]
  );

  const handleToggleMastered = useCallback(
    async (id: string, mastered: boolean) => {
      try {
        const { phrase } = await updatePhraseApi(id, { mastered });
        setVocabulary((prev) => prev.map((v) => (v.id === phrase.id ? phrase : v)));
      } catch (err: any) {
        showToast(err?.message || 'Không thể cập nhật trạng thái.', 'error');
      }
    },
    [showToast]
  );

  const handleDeletePhrase = useCallback(
    async (id: string) => {
      try {
        await deletePhraseApi(id);
        setVocabulary((prev) => prev.filter((v) => v.id !== id));
        showToast('Đã xóa mẫu câu khỏi sổ.');
      } catch (err: any) {
        showToast(err?.message || 'Không thể xóa mẫu câu.', 'error');
      }
    },
    [showToast]
  );

  return (
    <div className="min-h-screen flex flex-col bg-[#F7F8F9] text-[#111827]">
      <TopBar
        activeView={activeView}
        onSelectView={setActiveView}
        onStartFreshSession={handleStartFreshSession}
        savedCount={savedConversations.length}
        vocabCount={vocabulary.length}
      />

      <div className="flex-1">
        {activeView === 'practice' && (
          <PracticeStudio
            scenario={activeScenario}
            partner={partner}
            level={level}
            pace={pace}
            mode={mode}
            turns={turns}
            liveStatus={live.status}
            liveError={live.errorMessage}
            isMuted={live.isMuted}
            isPartnerSpeaking={live.isPartnerSpeaking}
            liveUserDraft={live.liveUserDraft}
            liveAssistantDraft={live.liveAssistantDraft}
            elapsedSeconds={live.elapsedSeconds}
            inputLevelRef={live.inputLevelRef}
            outputLevelRef={live.outputLevelRef}
            isTextReplying={isTextReplying}
            suggestions={suggestions}
            isLoadingSuggestions={isLoadingSuggestions}
            isSavingConversation={isSavingConversation}
            savedConversationId={savedConversationId}
            savedPhraseSet={savedPhraseSet}
            playingTtsKey={playingTtsKey}
            onChangePartner={setPartner}
            onChangeLevel={setLevel}
            onChangePace={setPace}
            onChangeMode={handleChangeMode}
            onStartVoice={handleStartVoice}
            onStopVoice={live.stopSession}
            onToggleMute={live.toggleMute}
            onSendMessage={handleSendMessage}
            onRequestSuggestions={handleRequestSuggestions}
            onPlayTts={(key, text, slow) => handlePlayTts(key, text, slow)}
            onSavePhrase={(kp) => handleSavePhrase(kp)}
            onSaveConversation={handleSaveConversation}
            onOpenScenarios={() => setActiveView('scenarios')}
            onOpenSaved={() => {
              if (savedConversationId) setSelectedSavedId(savedConversationId);
              setActiveView('saved');
            }}
          />
        )}

        {activeView === 'scenarios' && (
          <ScenarioHub
            scenarios={scenarios}
            activeScenarioId={activeScenario.id}
            onSelectScenario={(scene) => resetSessionForScenario(scene, scene.recommendedLevel)}
            onCreateCustomScenario={(created) => {
              setScenarios((prev) => [created, ...prev]);
              resetSessionForScenario(created, created.recommendedLevel);
            }}
          />
        )}

        {activeView === 'saved' && (
          <SavedConversations
            conversations={savedConversations}
            loading={loadingConversations}
            initialSelectedId={selectedSavedId}
            savedPhraseSet={savedPhraseSet}
            playingTtsKey={playingTtsKey}
            onPlayTts={handlePlayTts}
            onSavePhrase={(kp, title) => handleSavePhrase(kp, title)}
            onGenerateReview={handleGenerateReviewForSaved}
            onUpdateConversation={handleUpdateSavedConversation}
            onDeleteConversation={handleDeleteSavedConversation}
            onPracticeAgain={handlePracticeAgainFromSaved}
          />
        )}

        {activeView === 'vocabulary' && (
          <VocabularyNotebook
            phrases={vocabulary}
            loading={loadingVocabulary}
            playingTtsKey={playingTtsKey}
            onPlayTts={(key, text, slow) => handlePlayTts(key, text, slow)}
            onAddPhrase={async (p) => {
              await handleSavePhrase(p, p.scenarioTitle);
            }}
            onToggleMastered={handleToggleMastered}
            onDeletePhrase={handleDeletePhrase}
          />
        )}
      </div>

      {/* Quiet Editorial Footer */}
      <footer className="border-t border-[#E2E6EA] bg-white mt-12">
        <div className="max-w-[1320px] mx-auto px-4 sm:px-6 py-5 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-[#6B7280]">
          <span>YǔChá 语茶 · Không gian luyện phản xạ giao tiếp tiếng Trung hàng ngày</span>
          <span>Luyện nghe nói tự nhiên · Lưu hội thoại &amp; ôn tập mỗi ngày</span>
        </div>
      </footer>

      {/* Non-intrusive Toast Notification */}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className={`fixed bottom-5 right-5 z-50 px-4 py-2.5 rounded-lg text-xs font-medium shadow-md border ${
            toast.tone === 'error'
              ? 'bg-[#FEF2F2] border-[#FECACA] text-[#991B1B]'
              : 'bg-[#111827] border-[#111827] text-white'
          }`}
        >
          {toast.text}
        </div>
      )}
    </div>
  );
}
