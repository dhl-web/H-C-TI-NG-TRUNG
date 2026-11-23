import React, { useEffect, useRef, useState } from 'react';
import {
  Bookmark,
  BookmarkCheck,
  Check,
  Compass,
  Loader2,
  Mic,
  MicOff,
  PhoneOff,
  Send,
  Sparkles,
  Volume2,
} from 'lucide-react';
import {
  HskLevel,
  KeyPhrase,
  PartnerPersona,
  PracticeMode,
  Scenario,
  SpeakingPace,
  SuggestedReply,
  TranscriptTurn,
} from '../types';
import { HSK_LEVEL_DESCRIPTIONS, PARTNER_PERSONAS } from '../data/scenarios';
import { LiveConnectionStatus } from '../hooks/useLiveMandarin';
import { VoiceVisualizer } from './VoiceVisualizer';

interface PracticeStudioProps {
  scenario: Scenario;
  partner: PartnerPersona;
  level: HskLevel;
  pace: SpeakingPace;
  mode: PracticeMode;
  turns: TranscriptTurn[];
  liveStatus: LiveConnectionStatus;
  liveError: string | null;
  isMuted: boolean;
  isPartnerSpeaking: boolean;
  liveUserDraft: string;
  liveAssistantDraft: string;
  elapsedSeconds: number;
  inputLevelRef: React.MutableRefObject<number>;
  outputLevelRef: React.MutableRefObject<number>;
  isTextReplying: boolean;
  suggestions: SuggestedReply[];
  isLoadingSuggestions: boolean;
  isSavingConversation: boolean;
  savedConversationId: string | null;
  savedPhraseSet: Set<string>;
  playingTtsKey: string | null;
  onChangePartner: (partner: PartnerPersona) => void;
  onChangeLevel: (level: HskLevel) => void;
  onChangePace: (pace: SpeakingPace) => void;
  onChangeMode: (mode: PracticeMode) => void;
  onStartVoice: () => void;
  onStopVoice: () => void;
  onToggleMute: () => void;
  onSendMessage: (text: string) => void;
  onRequestSuggestions: () => void;
  onPlayTts: (key: string, text: string, slow?: boolean) => void;
  onSavePhrase: (phrase: KeyPhrase) => void;
  onSaveConversation: (withReview?: boolean) => void;
  onOpenScenarios: () => void;
  onOpenSaved: () => void;
}

const LEVELS: HskLevel[] = ['HSK 1–2', 'HSK 3–4', 'HSK 5–6'];
const PACES: Array<{ id: SpeakingPace; label: string }> = [
  { id: 'slow', label: 'Chậm rãi' },
  { id: 'natural', label: 'Tự nhiên' },
  { id: 'fast', label: 'Nhanh' },
];

function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export const PracticeStudio: React.FC<PracticeStudioProps> = ({
  scenario,
  partner,
  level,
  pace,
  mode,
  turns,
  liveStatus,
  liveError,
  isMuted,
  isPartnerSpeaking,
  liveUserDraft,
  liveAssistantDraft,
  elapsedSeconds,
  inputLevelRef,
  outputLevelRef,
  isTextReplying,
  suggestions,
  isLoadingSuggestions,
  isSavingConversation,
  savedConversationId,
  savedPhraseSet,
  playingTtsKey,
  onChangePartner,
  onChangeLevel,
  onChangePace,
  onChangeMode,
  onStartVoice,
  onStopVoice,
  onToggleMute,
  onSendMessage,
  onRequestSuggestions,
  onPlayTts,
  onSavePhrase,
  onSaveConversation,
  onOpenScenarios,
  onOpenSaved,
}) => {
  const [showPinyin, setShowPinyin] = useState(true);
  const [showVietnamese, setShowVietnamese] = useState(true);
  const [inputText, setInputText] = useState('');
  const transcriptEndRef = useRef<HTMLDivElement | null>(null);

  const isLiveConnected = liveStatus === 'connected';
  const isLiveConnecting = liveStatus === 'connecting';

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [turns.length, liveUserDraft, liveAssistantDraft, isTextReplying]);

  const handleSubmitText = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = inputText.trim();
    if (!cleaned) return;
    onSendMessage(cleaned);
    setInputText('');
  };

  const liveStatusLabel = isLiveConnecting
    ? 'Đang kết nối phiên thoại trực tiếp...'
    : isLiveConnected
    ? isPartnerSpeaking
      ? `${partner.name} đang nói...`
      : isMuted
      ? 'Micro đang tạm tắt'
      : 'Đang lắng nghe bạn nói tiếng Trung'
    : mode === 'voice'
    ? 'Nhấn Bắt đầu thoại để trò chuyện thời gian thực'
    : 'Chế độ nhắn tin kèm giọng đọc mẫu bản xứ';

  return (
    <main className="max-w-[1320px] mx-auto px-4 sm:px-6 py-6 sm:py-8">
      {/* Editorial Scenario Context Header */}
      <section className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6 border-b border-[#E2E6EA]">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 text-xs text-[#525B66] mb-2">
            <span>{scenario.category}</span>
            <span aria-hidden="true">·</span>
            <span>{level}</span>
            <span aria-hidden="true">·</span>
            <span>
              Đối tác {partner.name} ({partner.hanziName}, {partner.city})
            </span>
          </div>
          <div className="flex flex-wrap items-baseline gap-3">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#111827]">
              {scenario.title}
            </h1>
            <span className="font-hanzi text-xl sm:text-2xl font-semibold text-[#0F6B5E]">
              {scenario.hanziTitle}
            </span>
          </div>
        </div>

        {/* Mode Switcher + Change Scenario */}
        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <div
            className="inline-flex items-center p-1 bg-[#ECEFF2] rounded-lg"
            role="tablist"
            aria-label="Chế độ luyện tập"
          >
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'voice'}
              onClick={() => onChangeMode('voice')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                mode === 'voice'
                  ? 'bg-white text-[#111827] shadow-xs'
                  : 'text-[#525B66] hover:text-[#111827]'
              }`}
            >
              Thoại trực tiếp
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'text'}
              onClick={() => onChangeMode('text')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                mode === 'text'
                  ? 'bg-white text-[#111827] shadow-xs'
                  : 'text-[#525B66] hover:text-[#111827]'
              }`}
            >
              Nhắn tin &amp; Nghe
            </button>
          </div>

          <button
            type="button"
            onClick={onOpenScenarios}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-[#1F2937] bg-white border border-[#D8DFE6] hover:border-[#0F6B5E] hover:text-[#0F6B5E] rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Compass className="w-3.5 h-3.5" />
            Đổi chủ đề
          </button>
        </div>
      </section>

      {/* Two-Zone Studio Grid */}
      <div className="mt-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT ZONE (7 cols -> ~60%): Live Acoustic Stage + Transcript */}
        <div className="lg:col-span-8 flex flex-col bg-white border border-[#E2E6EA] rounded-xl overflow-hidden">
          {/* Top Live Voice Stage */}
          <div className="p-5 sm:p-6 border-b border-[#ECEFF2] bg-[#FAFBFB]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2.5">
                  {isLiveConnected && (
                    <span
                      className={`inline-block w-2 h-2 rounded-full ${
                        isPartnerSpeaking ? 'bg-[#0F6B5E]' : isMuted ? 'bg-[#9CA3AF]' : 'bg-[#C83E2B]'
                      }`}
                      aria-hidden="true"
                    />
                  )}
                  <p className="text-sm font-semibold text-[#111827]">{liveStatusLabel}</p>
                </div>
                <p className="text-xs text-[#525B66] mt-1">
                  {mode === 'voice'
                    ? 'Hỗ trợ ngắt lời tự nhiên như trò chuyện thật — cứ nói tiếng Trung, nếu bí có thể chen tiếng Việt.'
                    : 'Gõ chữ Hán, Pinyin hoặc tiếng Việt — đối tác sẽ phản hồi bằng tiếng Trung tự nhiên và gợi ý cách diễn đạt.'}
                </p>
              </div>

              <div className="flex items-center gap-2.5 shrink-0">
                {isLiveConnected && (
                  <span className="font-mono text-xs font-medium text-[#525B66] tabular-nums pr-1">
                    {formatDuration(elapsedSeconds)}
                  </span>
                )}

                {mode === 'voice' ? (
                  !isLiveConnected ? (
                    <button
                      type="button"
                      disabled={isLiveConnecting}
                      onClick={onStartVoice}
                      className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-[#0F6B5E] hover:bg-[#0B5248] disabled:opacity-60 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0F6B5E]"
                    >
                      {isLiveConnecting ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Mic className="w-4 h-4" />
                      )}
                      {isLiveConnecting ? 'Đang kết nối' : 'Bắt đầu thoại'}
                    </button>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={onToggleMute}
                        className={`inline-flex items-center gap-1.5 px-3.5 py-2.5 text-sm font-medium rounded-lg border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                          isMuted
                            ? 'bg-[#FEF2F2] border-[#FECACA] text-[#B91C1C]'
                            : 'bg-white border-[#D8DFE6] text-[#1F2937] hover:bg-[#F3F4F6]'
                        }`}
                      >
                        {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                        {isMuted ? 'Mở micro' : 'Tắt tiếng'}
                      </button>
                      <button
                        type="button"
                        onClick={onStopVoice}
                        className="inline-flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold text-white bg-[#C83E2B] hover:bg-[#A83121] rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        <PhoneOff className="w-4 h-4" />
                        Kết thúc
                      </button>
                    </>
                  )
                ) : (
                  <button
                    type="button"
                    onClick={() => onSendMessage('__START_CONVERSATION__')}
                    disabled={isTextReplying}
                    className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-[#0F6B5E] hover:bg-[#0B5248] disabled:opacity-60 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    {isTextReplying ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Volume2 className="w-4 h-4" />
                    )}
                    Mở đầu hội thoại
                  </button>
                )}
              </div>
            </div>

            {mode === 'voice' && (
              <div className="mt-4 pt-3 border-t border-[#ECEFF2]">
                <VoiceVisualizer
                  active={isLiveConnected}
                  isPartnerSpeaking={isPartnerSpeaking}
                  isMuted={isMuted}
                  inputLevelRef={inputLevelRef}
                  outputLevelRef={outputLevelRef}
                />
              </div>
            )}

            {liveError && (
              <div
                role="alert"
                className="mt-3 p-3 rounded-lg bg-[#FEF2F2] border border-[#FECACA] text-xs text-[#991B1B] flex items-center justify-between gap-3"
              >
                <span>{liveError}</span>
                {mode === 'voice' && (
                  <button
                    type="button"
                    onClick={() => onChangeMode('text')}
                    className="font-semibold underline whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    Chuyển sang Nhắn tin
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Transcript Display Controls + Save Action */}
          <div className="px-5 sm:px-6 py-3 border-b border-[#ECEFF2] flex flex-wrap items-center justify-between gap-3 bg-white">
            <div className="flex items-center gap-4 text-xs">
              <span className="font-semibold text-[#111827] whitespace-nowrap">
                Bản ghi hội thoại
                <span className="ml-1.5 font-mono font-normal text-[#6B7280] tabular-nums">
                  {turns.length} lượt
                </span>
              </span>
              <span className="text-[#D8DFE6]" aria-hidden="true">|</span>
              <label className="inline-flex items-center gap-1.5 text-[#525B66] cursor-pointer select-none whitespace-nowrap">
                <input
                  type="checkbox"
                  checked={showPinyin}
                  onChange={(e) => setShowPinyin(e.target.checked)}
                  className="accent-[#0F6B5E] rounded cursor-pointer"
                />
                Pinyin
              </label>
              <label className="inline-flex items-center gap-1.5 text-[#525B66] cursor-pointer select-none whitespace-nowrap">
                <input
                  type="checkbox"
                  checked={showVietnamese}
                  onChange={(e) => setShowVietnamese(e.target.checked)}
                  className="accent-[#0F6B5E] rounded cursor-pointer"
                />
                Dịch tiếng Việt
              </label>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {savedConversationId && (
                <button
                  type="button"
                  onClick={onOpenSaved}
                  className="text-xs font-medium text-[#0F6B5E] hover:underline whitespace-nowrap shrink-0 cursor-pointer"
                >
                  Xem bản lưu
                </button>
              )}
              <button
                type="button"
                disabled={turns.length === 0 || isSavingConversation}
                onClick={() => onSaveConversation(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-[#D8DFE6] bg-white hover:border-[#0F6B5E] hover:text-[#0F6B5E] disabled:opacity-45 disabled:hover:border-[#D8DFE6] disabled:hover:text-[#1F2937] text-[#1F2937] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                {isSavingConversation ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : savedConversationId ? (
                  <BookmarkCheck className="w-3.5 h-3.5 text-[#0F6B5E]" />
                ) : (
                  <Bookmark className="w-3.5 h-3.5" />
                )}
                {isSavingConversation
                  ? 'Đang lưu & tổng kết...'
                  : savedConversationId
                  ? 'Cập nhật bản lưu'
                  : 'Lưu hội thoại'}
              </button>
            </div>
          </div>

          {/* Conversation Transcript Stream */}
          <div className="p-5 sm:p-6 min-h-[400px] max-h-[560px] overflow-y-auto space-y-5 bg-white">
            {turns.length === 0 && !liveUserDraft && !liveAssistantDraft ? (
              <div className="py-12 text-center max-w-md mx-auto">
                <p className="font-hanzi text-2xl text-[#0F6B5E] font-semibold">你好，准备好了吗？</p>
                <p className="text-sm text-[#525B66] mt-2 leading-relaxed">
                  {mode === 'voice'
                    ? `Nhấn "Bắt đầu thoại" để ${partner.name} chào mở đầu bằng tiếng Trung. Mọi câu thoại sẽ tự động hiện chữ Hán, Pinyin, nghĩa tiếng Việt và nhận xét cách diễn đạt tự nhiên.`
                    : `Nhấn "Mở đầu hội thoại" hoặc gõ câu chào đầu tiên bằng chữ Hán, Pinyin hoặc tiếng Việt bên dưới.`}
                </p>
              </div>
            ) : (
              <>
                {turns.map((turn) => {
                  const isUser = turn.role === 'user';
                  const normalKey = `${turn.id}_normal`;
                  const slowKey = `${turn.id}_slow`;

                  return (
                    <article
                      key={turn.id}
                      className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
                    >
                      <div className="flex items-center gap-2 text-[11px] text-[#6B7280] mb-1 px-1">
                        <span className="font-medium text-[#374151]">
                          {isUser ? 'Bạn' : `${partner.name} (${partner.hanziName})`}
                        </span>
                        <span aria-hidden="true">·</span>
                        <time className="font-mono tabular-nums">
                          {new Date(turn.timestamp).toLocaleTimeString('vi-VN', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </time>
                      </div>

                      <div
                        className={`max-w-[90%] sm:max-w-[82%] rounded-xl px-4 py-3.5 border ${
                          isUser
                            ? 'bg-[#F0F7F5] border-[#CDE4DF] text-[#111827]'
                            : 'bg-[#F8F9FA] border-[#E5E9EE] text-[#111827]'
                        }`}
                      >
                        <p className="font-hanzi text-[18px] leading-relaxed text-[#111827]">
                          {turn.hanzi}
                        </p>

                        {turn.enriching ? (
                          <div className="mt-2 flex items-center gap-1.5 text-xs text-[#6B7280]">
                            <Loader2 className="w-3 h-3 animate-spin" />
                            <span>Đang phân tích Pinyin và dịch nghĩa...</span>
                          </div>
                        ) : (
                          <>
                            {showPinyin && turn.pinyin && (
                              <p className="mt-1 text-[13px] text-[#0F6B5E] font-medium leading-snug">
                                {turn.pinyin}
                              </p>
                            )}
                            {showVietnamese && turn.vietnamese && (
                              <p className="mt-1 text-[13px] text-[#525B66] leading-relaxed">
                                {turn.vietnamese}
                              </p>
                            )}
                          </>
                        )}

                        {/* Per-line Audio Replay Controls */}
                        <div className="mt-2.5 pt-2 border-t border-black/5 flex flex-wrap items-center gap-3 text-xs">
                          <button
                            type="button"
                            onClick={() => onPlayTts(normalKey, turn.hanzi, false)}
                            disabled={playingTtsKey === normalKey}
                            className="inline-flex items-center gap-1 text-[#374151] hover:text-[#0F6B5E] font-medium transition-colors cursor-pointer whitespace-nowrap"
                          >
                            {playingTtsKey === normalKey ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin text-[#0F6B5E]" />
                            ) : (
                              <Volume2 className="w-3.5 h-3.5" />
                            )}
                            Nghe mẫu
                          </button>
                          <button
                            type="button"
                            onClick={() => onPlayTts(slowKey, turn.hanzi, true)}
                            disabled={playingTtsKey === slowKey}
                            className="inline-flex items-center gap-1 text-[#525B66] hover:text-[#0F6B5E] transition-colors cursor-pointer whitespace-nowrap"
                          >
                            {playingTtsKey === slowKey ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin text-[#0F6B5E]" />
                            ) : (
                              <Volume2 className="w-3.5 h-3.5" />
                            )}
                            Nghe chậm
                          </button>
                        </div>

                        {/* Naturalness Coaching Feedback (for learner turns) */}
                        {isUser && turn.feedback && turn.feedback.explanationVi && (
                          <div className="mt-3 pt-2.5 border-t border-[#CDE4DF] text-xs space-y-1">
                            <div className="flex items-center gap-1.5 font-semibold text-[#0F6B5E]">
                              {turn.feedback.isNatural ? (
                                <>
                                  <Check className="w-3.5 h-3.5" />
                                  <span>Cách nói tự nhiên</span>
                                </>
                              ) : (
                                <>
                                  <Sparkles className="w-3.5 h-3.5 text-[#B45309]" />
                                  <span className="text-[#92400E]">Gợi ý tự nhiên hơn</span>
                                </>
                              )}
                            </div>
                            {!turn.feedback.isNatural && turn.feedback.betterHanzi && (
                              <div className="bg-white/90 border border-[#E5E9EE] rounded-lg px-3 py-2 mt-1">
                                <div className="flex items-start justify-between gap-2">
                                  <div>
                                    <p className="font-hanzi text-sm font-semibold text-[#111827]">
                                      {turn.feedback.betterHanzi}
                                    </p>
                                    {turn.feedback.betterPinyin && (
                                      <p className="text-xs text-[#0F6B5E] mt-0.5">
                                        {turn.feedback.betterPinyin}
                                      </p>
                                    )}
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      onPlayTts(`${turn.id}_better`, turn.feedback!.betterHanzi!, false)
                                    }
                                    className="p-1.5 text-[#525B66] hover:text-[#0F6B5E] cursor-pointer shrink-0"
                                    title="Nghe cách nói tự nhiên hơn"
                                  >
                                    <Volume2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            )}
                            <p className="text-[#4B5563] leading-relaxed">
                              {turn.feedback.explanationVi}
                            </p>
                          </div>
                        )}

                        {/* Extracted Everyday Phrases to Save */}
                        {turn.keyPhrases && turn.keyPhrases.length > 0 && (
                          <div className="mt-3 pt-2.5 border-t border-black/5 space-y-1.5">
                            <p className="text-[11px] font-semibold text-[#525B66]">
                              Cụm từ khẩu ngữ hay
                            </p>
                            {turn.keyPhrases.map((kp, idx) => {
                              const alreadySaved = savedPhraseSet.has(kp.hanzi.trim());
                              return (
                                <div
                                  key={`${turn.id}_kp_${idx}`}
                                  className="flex items-center justify-between gap-3 text-xs bg-white/80 border border-[#E5E9EE] rounded-lg px-2.5 py-1.5"
                                >
                                  <div className="min-w-0">
                                    <span className="font-hanzi font-semibold text-[#111827]">
                                      {kp.hanzi}
                                    </span>
                                    <span className="text-[#0F6B5E] ml-1.5">{kp.pinyin}</span>
                                    <span className="text-[#525B66] ml-1.5">— {kp.vietnamese}</span>
                                  </div>
                                  <button
                                    type="button"
                                    disabled={alreadySaved}
                                    onClick={() => onSavePhrase(kp)}
                                    className={`text-[11px] font-semibold whitespace-nowrap shrink-0 cursor-pointer ${
                                      alreadySaved
                                        ? 'text-[#0F6B5E]'
                                        : 'text-[#374151] hover:text-[#0F6B5E]'
                                    }`}
                                  >
                                    {alreadySaved ? 'Đã lưu' : '+ Lưu từ'}
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </article>
                  );
                })}

                {/* Live Streaming Drafts while speaking */}
                {liveUserDraft && (
                  <div className="flex flex-col items-end">
                    <span className="text-[11px] text-[#6B7280] mb-1 px-1">Bạn (đang nói...)</span>
                    <div className="max-w-[82%] rounded-xl px-4 py-3 bg-[#F0F7F5]/70 border border-dashed border-[#99CFC4]">
                      <p className="font-hanzi text-[17px] text-[#111827]">{liveUserDraft}</p>
                    </div>
                  </div>
                )}

                {liveAssistantDraft && (
                  <div className="flex flex-col items-start">
                    <span className="text-[11px] text-[#6B7280] mb-1 px-1">
                      {partner.name} (đang trả lời...)
                    </span>
                    <div className="max-w-[82%] rounded-xl px-4 py-3 bg-[#F8F9FA] border border-dashed border-[#CBD5E1]">
                      <p className="font-hanzi text-[17px] text-[#111827]">{liveAssistantDraft}</p>
                    </div>
                  </div>
                )}

                {isTextReplying && (
                  <div className="flex items-center gap-2 text-xs text-[#525B66] px-1">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-[#0F6B5E]" />
                    <span>{partner.name} đang suy nghĩ câu trả lời...</span>
                  </div>
                )}
              </>
            )}
            <div ref={transcriptEndRef} />
          </div>

          {/* Bottom Composer (Works in Text Mode AND as live cue input during Voice Mode) */}
          <form
            onSubmit={handleSubmitText}
            className="p-4 border-t border-[#ECEFF2] bg-[#FAFBFB] flex items-center gap-2.5"
          >
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={
                mode === 'voice'
                  ? isLiveConnected
                    ? 'Hoặc gõ nhanh chữ Hán / câu hỏi gửi vào cuộc thoại...'
                    : 'Bắt đầu thoại ở trên hoặc gõ để chuyển sang nhắn tin...'
                  : 'Nhập tiếng Trung, Pinyin hoặc tiếng Việt để trả lời...'
              }
              className="flex-1 min-w-0 bg-white border border-[#D8DFE6] focus:border-[#0F6B5E] focus:outline-none rounded-lg px-3.5 py-2.5 text-sm text-[#111827] placeholder:text-[#9CA3AF]"
            />
            <button
              type="submit"
              disabled={!inputText.trim() || isTextReplying}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold text-white bg-[#111827] hover:bg-[#0F6B5E] disabled:opacity-45 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Send className="w-4 h-4" />
              Gửi
            </button>
          </form>
        </div>

        {/* RIGHT ZONE (4 cols -> ~35-40%): Concept, Tuning & Reply Suggestions Deck */}
        <aside className="lg:col-span-4 space-y-5">
          {/* 1. Contextual Reply Suggestions */}
          <section className="bg-white border border-[#E2E6EA] rounded-xl p-5">
            <div className="flex items-center justify-between gap-2 mb-3">
              <h2 className="text-sm font-bold text-[#111827]">Gợi ý câu trả lời</h2>
              <button
                type="button"
                onClick={onRequestSuggestions}
                disabled={isLoadingSuggestions}
                className="text-xs font-semibold text-[#0F6B5E] hover:underline disabled:opacity-50 whitespace-nowrap shrink-0 cursor-pointer"
              >
                {isLoadingSuggestions ? 'Đang gợi ý...' : 'Làm mới gợi ý'}
              </button>
            </div>
            <p className="text-xs text-[#525B66] mb-3.5 leading-relaxed">
              Khi bí từ hoặc muốn diễn đạt tự nhiên hơn, nhấn để lấy 3 mẫu câu hợp ngữ cảnh hiện tại.
            </p>

            {suggestions.length === 0 ? (
              <button
                type="button"
                onClick={onRequestSuggestions}
                disabled={isLoadingSuggestions}
                className="w-full py-2.5 px-4 text-xs font-semibold text-[#0F6B5E] bg-[#ECF6F4] hover:bg-[#DCEEEB] rounded-lg transition-colors cursor-pointer"
              >
                {isLoadingSuggestions ? 'Đang tạo gợi ý...' : 'Gợi ý 3 cách nói tiếp'}
              </button>
            ) : (
              <div className="space-y-2.5">
                {suggestions.map((item, idx) => {
                  const ttsId = `sug_${idx}`;
                  return (
                    <div
                      key={idx}
                      className="p-3 rounded-lg border border-[#E5E9EE] hover:border-[#0F6B5E]/50 bg-[#FAFBFB] transition-colors"
                    >
                      <div className="flex items-center justify-between gap-2 text-[11px] text-[#525B66] mb-1">
                        <span>{item.tone}</span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => onPlayTts(ttsId, item.hanzi, false)}
                            className="text-[#374151] hover:text-[#0F6B5E] font-medium cursor-pointer"
                          >
                            Nghe
                          </button>
                          <span aria-hidden="true">·</span>
                          <button
                            type="button"
                            onClick={() => onSendMessage(item.hanzi)}
                            className="text-[#0F6B5E] font-semibold hover:underline cursor-pointer"
                          >
                            Dùng câu này
                          </button>
                        </div>
                      </div>
                      <p className="font-hanzi text-[15px] font-medium text-[#111827]">
                        {item.hanzi}
                      </p>
                      <p className="text-xs text-[#0F6B5E] mt-0.5">{item.pinyin}</p>
                      <p className="text-xs text-[#525B66] mt-0.5">{item.vietnamese}</p>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* 2. Session Tuning (Level, Partner Voice, Pace) */}
          <section className="bg-white border border-[#E2E6EA] rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-[#111827]">Tùy chỉnh buổi luyện</h2>
              {isLiveConnected && (
                <span className="text-[11px] text-[#6B7280]">Áp dụng cho phiên mới</span>
              )}
            </div>

            {/* HSK Level */}
            <div>
              <label className="block text-xs font-semibold text-[#374151] mb-1.5">
                Trình độ hội thoại
              </label>
              <div className="grid grid-cols-3 gap-1 p-1 bg-[#ECEFF2] rounded-lg">
                {LEVELS.map((lv) => (
                  <button
                    key={lv}
                    type="button"
                    onClick={() => onChangeLevel(lv)}
                    className={`py-1.5 px-2 text-xs font-semibold rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                      level === lv
                        ? 'bg-white text-[#111827] shadow-xs'
                        : 'text-[#525B66] hover:text-[#111827]'
                    }`}
                  >
                    {lv}
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-[#525B66] mt-1.5 leading-relaxed">
                {HSK_LEVEL_DESCRIPTIONS[level]}
              </p>
            </div>

            {/* Speaking Pace */}
            <div>
              <label className="block text-xs font-semibold text-[#374151] mb-1.5">
                Tốc độ nói của đối tác
              </label>
              <div className="grid grid-cols-3 gap-1 p-1 bg-[#ECEFF2] rounded-lg">
                {PACES.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => onChangePace(p.id)}
                    className={`py-1.5 px-2 text-xs font-semibold rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                      pace === p.id
                        ? 'bg-white text-[#111827] shadow-xs'
                        : 'text-[#525B66] hover:text-[#111827]'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Partner Voice Selection */}
            <div>
              <label className="block text-xs font-semibold text-[#374151] mb-1.5">
                Đối tác bản xứ
              </label>
              <div className="grid grid-cols-2 gap-2">
                {PARTNER_PERSONAS.map((p) => {
                  const selected = partner.id === p.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => onChangePartner(p)}
                      className={`text-left p-2.5 rounded-lg border transition-colors cursor-pointer ${
                        selected
                          ? 'border-[#0F6B5E] bg-[#ECF6F4]/60'
                          : 'border-[#E5E9EE] bg-white hover:border-[#CBD5E1]'
                      }`}
                    >
                      <div className="flex items-baseline justify-between gap-1">
                        <span className="text-xs font-semibold text-[#111827] truncate">
                          {p.name}
                        </span>
                        <span className="font-hanzi text-xs text-[#0F6B5E] shrink-0">
                          {p.hanziName}
                        </span>
                      </div>
                      <p className="text-[11px] text-[#525B66] mt-0.5 truncate">{p.city}</p>
                    </button>
                  );
                })}
              </div>
            </div>
          </section>

          {/* 3. Scenario Goal & Starter Expressions */}
          <section className="bg-white border border-[#E2E6EA] rounded-xl p-5 space-y-3.5">
            <div>
              <h2 className="text-sm font-bold text-[#111827]">Mục tiêu tình huống</h2>
              <p className="text-xs text-[#4B5563] mt-1 leading-relaxed">
                {scenario.openingGoal}
              </p>
            </div>

            <div className="pt-3 border-t border-[#ECEFF2] space-y-2.5">
              <h3 className="text-xs font-semibold text-[#374151]">Mẫu câu khởi động</h3>
              {scenario.starterPhrases.map((sp, i) => {
                const ttsKey = `starter_${scenario.id}_${i}`;
                const saved = savedPhraseSet.has(sp.hanzi.trim());
                return (
                  <div
                    key={i}
                    className="pb-2.5 last:pb-0 border-b last:border-b-0 border-[#F1F3F5]"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-hanzi text-sm font-medium text-[#111827]">{sp.hanzi}</p>
                      <div className="flex items-center gap-2 shrink-0 text-[11px]">
                        <button
                          type="button"
                          onClick={() => onPlayTts(ttsKey, sp.hanzi, false)}
                          className="text-[#525B66] hover:text-[#0F6B5E] cursor-pointer"
                          title="Nghe phát âm mẫu"
                        >
                          <Volume2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          disabled={saved}
                          onClick={() =>
                            onSavePhrase({
                              hanzi: sp.hanzi,
                              pinyin: sp.pinyin,
                              vietnamese: sp.vietnamese,
                            })
                          }
                          className={`font-semibold cursor-pointer ${
                            saved ? 'text-[#0F6B5E]' : 'text-[#525B66] hover:text-[#0F6B5E]'
                          }`}
                        >
                          {saved ? 'Đã lưu' : '+ Lưu'}
                        </button>
                      </div>
                    </div>
                    <p className="text-xs text-[#0F6B5E] mt-0.5">{sp.pinyin}</p>
                    <p className="text-xs text-[#525B66] mt-0.5">{sp.vietnamese}</p>
                  </div>
                );
              })}
            </div>
          </section>
        </aside>
      </div>
    </main>
  );
};
