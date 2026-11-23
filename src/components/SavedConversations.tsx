import React, { useEffect, useMemo, useState } from 'react';
import {
  Bookmark,
  Check,
  Download,
  Loader2,
  RotateCcw,
  Search,
  Sparkles,
  Trash2,
  Volume2,
} from 'lucide-react';
import { HskLevel, KeyPhrase, SavedConversation } from '../types';

interface SavedConversationsProps {
  conversations: SavedConversation[];
  loading: boolean;
  initialSelectedId?: string | null;
  savedPhraseSet: Set<string>;
  playingTtsKey: string | null;
  onPlayTts: (key: string, text: string, slow?: boolean, voiceName?: SavedConversation['voiceName']) => void;
  onSavePhrase: (phrase: KeyPhrase, scenarioTitle: string) => void;
  onGenerateReview: (conversation: SavedConversation) => Promise<void>;
  onUpdateConversation: (id: string, patch: Partial<SavedConversation>) => Promise<void>;
  onDeleteConversation: (id: string) => Promise<void>;
  onPracticeAgain: (conversation: SavedConversation) => void;
}

const LEVEL_FILTERS: Array<'Tất cả' | HskLevel> = ['Tất cả', 'HSK 1–2', 'HSK 3–4', 'HSK 5–6'];

function formatDuration(sec: number): string {
  if (!sec || sec < 1) return '< 1 phút';
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return m > 0 ? `${m}p ${s}s` : `${s}s`;
}

function formatDate(ts: number): string {
  return new Date(ts).toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export const SavedConversations: React.FC<SavedConversationsProps> = ({
  conversations,
  loading,
  initialSelectedId,
  savedPhraseSet,
  playingTtsKey,
  onPlayTts,
  onSavePhrase,
  onGenerateReview,
  onUpdateConversation,
  onDeleteConversation,
  onPracticeAgain,
}) => {
  const [search, setSearch] = useState('');
  const [levelFilter, setLevelFilter] = useState<'Tất cả' | HskLevel>('Tất cả');
  const [selectedId, setSelectedId] = useState<string | null>(initialSelectedId || null);
  const [reviewTab, setReviewTab] = useState<'transcript' | 'insights'>('transcript');
  const [showPinyin, setShowPinyin] = useState(true);
  const [showVietnamese, setShowVietnamese] = useState(true);
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState('');
  const [titleDraft, setTitleDraft] = useState('');
  const [savingMeta, setSavingMeta] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return conversations.filter((c) => {
      if (levelFilter !== 'Tất cả' && c.level !== levelFilter) return false;
      if (!q) return true;
      const inTitle =
        c.title.toLowerCase().includes(q) ||
        c.scenarioTitle.toLowerCase().includes(q) ||
        c.scenarioHanziTitle.toLowerCase().includes(q);
      const inTurns = c.turns.some(
        (t) =>
          t.hanzi.toLowerCase().includes(q) ||
          (t.pinyin && t.pinyin.toLowerCase().includes(q)) ||
          (t.vietnamese && t.vietnamese.toLowerCase().includes(q))
      );
      return inTitle || inTurns;
    });
  }, [conversations, levelFilter, search]);

  useEffect(() => {
    if (initialSelectedId && conversations.some((c) => c.id === initialSelectedId)) {
      setSelectedId(initialSelectedId);
      return;
    }
    if (!selectedId && filtered.length > 0) {
      setSelectedId(filtered[0].id);
    } else if (selectedId && !conversations.some((c) => c.id === selectedId)) {
      setSelectedId(filtered[0]?.id ?? null);
    }
  }, [conversations, filtered, initialSelectedId, selectedId]);

  const selected = useMemo(
    () => conversations.find((c) => c.id === selectedId) ?? null,
    [conversations, selectedId]
  );

  useEffect(() => {
    if (selected) {
      setNoteDraft(selected.personalNote ?? '');
      setTitleDraft(selected.title);
      setConfirmDeleteId(null);
    }
  }, [selected?.id, selected?.title, selected?.personalNote]);

  const handleSaveMeta = async () => {
    if (!selected) return;
    setSavingMeta(true);
    try {
      await onUpdateConversation(selected.id, {
        title: titleDraft.trim() || selected.title,
        personalNote: noteDraft,
      });
    } finally {
      setSavingMeta(false);
    }
  };

  const handleGenerateReviewClick = async () => {
    if (!selected) return;
    setGeneratingId(selected.id);
    try {
      await onGenerateReview(selected);
      setReviewTab('insights');
    } finally {
      setGeneratingId(null);
    }
  };

  const handleExportMarkdown = (conv: SavedConversation) => {
    const lines: string[] = [
      `# ${conv.title}`,
      ``,
      `- Chủ đề: ${conv.scenarioTitle} (${conv.scenarioHanziTitle})`,
      `- Trình độ: ${conv.level}`,
      `- Đối tác: ${conv.partnerName}`,
      `- Ngày lưu: ${formatDate(conv.createdAt)}`,
      ``,
      `## Bản ghi hội thoại`,
      ``,
    ];
    for (const t of conv.turns) {
      lines.push(`**${t.role === 'user' ? 'Bạn' : conv.partnerName}**: ${t.hanzi}`);
      if (t.pinyin) lines.push(`*${t.pinyin}*`);
      if (t.vietnamese) lines.push(`> ${t.vietnamese}`);
      if (t.feedback && !t.feedback.isNatural && t.feedback.betterHanzi) {
        lines.push(`- Gợi ý tự nhiên hơn: ${t.feedback.betterHanzi} (${t.feedback.betterPinyin || ''}) — ${t.feedback.explanationVi}`);
      }
      lines.push('');
    }
    if (conv.review) {
      lines.push(`## Tổng kết luyện tập`, '', conv.review.summaryVi, '');
      if (conv.review.upgrades.length > 0) {
        lines.push(`### Diễn đạt tự nhiên hơn`, '');
        for (const up of conv.review.upgrades) {
          lines.push(`- "${up.original}" → **${up.naturalHanzi}** (${up.naturalPinyin}): ${up.explanationVi}`);
        }
        lines.push('');
      }
    }
    const blob = new Blob([lines.join('\n')], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${conv.title.replace(/[^\p{L}\p{N}\s-]/gu, '').trim().replace(/\s+/g, '-') || 'hoi-thoai-tieng-trung'}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <main className="max-w-[1320px] mx-auto px-4 sm:px-6 py-8">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6 border-b border-[#E2E6EA]">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#111827]">
            Hội thoại đã lưu
          </h1>
          <p className="text-sm text-[#525B66] mt-1.5">
            Xem lại bản ghi chữ Hán, Pinyin, nghe lại từng câu bằng giọng bản xứ và ôn tập các cách diễn đạt tự nhiên hơn.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-[#6B7280] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm chữ Hán, Pinyin hoặc chủ đề..."
              className="pl-9 pr-3.5 py-2 text-xs bg-white border border-[#D8DFE6] focus:border-[#0F6B5E] focus:outline-none rounded-lg w-60"
            />
          </div>

          <div className="inline-flex items-center p-1 bg-[#ECEFF2] rounded-lg">
            {LEVEL_FILTERS.map((lv) => (
              <button
                key={lv}
                type="button"
                onClick={() => setLevelFilter(lv)}
                className={`px-2.5 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  levelFilter === lv
                    ? 'bg-white text-[#111827] shadow-xs'
                    : 'text-[#525B66] hover:text-[#111827]'
                }`}
              >
                {lv}
              </button>
            ))}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="py-20 flex items-center justify-center gap-2 text-sm text-[#525B66]">
          <Loader2 className="w-4 h-4 animate-spin text-[#0F6B5E]" />
          <span>Đang tải các cuộc hội thoại đã lưu...</span>
        </div>
      ) : conversations.length === 0 ? (
        <div className="mt-10 bg-white border border-[#E2E6EA] rounded-xl p-12 text-center max-w-xl mx-auto">
          <Bookmark className="w-8 h-8 text-[#0F6B5E] mx-auto mb-3" />
          <h2 className="text-lg font-bold text-[#111827]">Chưa có cuộc hội thoại nào được lưu</h2>
          <p className="text-sm text-[#525B66] mt-2 leading-relaxed">
            Sau khi luyện nói hoặc nhắn tin với đối tác tiếng Trung, nhấn nút{' '}
            <strong className="text-[#111827]">Lưu hội thoại</strong> để lưu bản ghi đầy đủ kèm tổng kết cách diễn đạt bản xứ tại đây.
          </p>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Archive List */}
          <aside className="lg:col-span-4 bg-white border border-[#E2E6EA] rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-[#ECEFF2] bg-[#FAFBFB] flex items-center justify-between text-xs">
              <span className="font-semibold text-[#111827]">Danh sách phiên luyện</span>
              <span className="font-mono text-[#6B7280] tabular-nums">{filtered.length} phiên</span>
            </div>

            {filtered.length === 0 ? (
              <p className="p-6 text-xs text-[#525B66] text-center">
                Không tìm thấy hội thoại phù hợp với từ khóa.
              </p>
            ) : (
              <ul className="divide-y divide-[#ECEFF2] max-h-[680px] overflow-y-auto">
                {filtered.map((conv) => {
                  const active = conv.id === selected?.id;
                  return (
                    <li key={conv.id}>
                      <button
                        type="button"
                        onClick={() => setSelectedId(conv.id)}
                        className={`w-full text-left px-4 py-4 transition-colors cursor-pointer ${
                          active ? 'bg-[#ECF6F4]/70' : 'hover:bg-[#F8F9FA]'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2 text-[11px] text-[#525B66]">
                          <span className="truncate">
                            {conv.level} · {conv.turns.length} lượt · {formatDuration(conv.durationSeconds)}
                          </span>
                          {conv.review && (
                            <span className="text-[#0F6B5E] font-medium shrink-0">Có tổng kết</span>
                          )}
                        </div>
                        <p
                          className={`mt-1 text-sm font-semibold leading-snug ${
                            active ? 'text-[#0F6B5E]' : 'text-[#111827]'
                          }`}
                        >
                          {conv.title}
                        </p>
                        <p className="text-xs text-[#525B66] mt-0.5 truncate">
                          {conv.scenarioTitle} · {conv.partnerName}
                        </p>
                        <p className="text-[11px] font-mono text-[#6B7280] mt-1.5 tabular-nums">
                          {formatDate(conv.createdAt)}
                        </p>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </aside>

          {/* Right Detailed Review Canvas */}
          <section className="lg:col-span-8 bg-white border border-[#E2E6EA] rounded-xl overflow-hidden">
            {!selected ? (
              <div className="p-12 text-center text-sm text-[#525B66]">
                Chọn một cuộc hội thoại ở cột bên trái để xem lại chi tiết.
              </div>
            ) : (
              <>
                {/* Selected Session Header */}
                <div className="p-5 sm:p-6 border-b border-[#ECEFF2] bg-[#FAFBFB] space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 text-xs text-[#525B66] mb-1.5">
                        <span>{selected.scenarioTitle}</span>
                        <span aria-hidden="true">·</span>
                        <span className="font-hanzi text-[#0F6B5E]">{selected.scenarioHanziTitle}</span>
                        <span aria-hidden="true">·</span>
                        <span>{selected.level}</span>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono tabular-nums">{formatDate(selected.createdAt)}</span>
                      </div>

                      <input
                        type="text"
                        value={titleDraft}
                        onChange={(e) => setTitleDraft(e.target.value)}
                        onBlur={handleSaveMeta}
                        aria-label="Tiêu đề cuộc hội thoại"
                        className="w-full text-xl font-bold text-[#111827] bg-transparent border-b border-transparent hover:border-[#D8DFE6] focus:border-[#0F6B5E] focus:outline-none pb-0.5"
                      />
                    </div>

                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => onPracticeAgain(selected)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-[#0F6B5E] hover:bg-[#0B5248] rounded-lg transition-colors whitespace-nowrap cursor-pointer"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        Luyện lại chủ đề
                      </button>

                      <button
                        type="button"
                        onClick={() => handleExportMarkdown(selected)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#374151] bg-white border border-[#D8DFE6] hover:border-[#0F6B5E] rounded-lg transition-colors whitespace-nowrap cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5" />
                        Xuất .md
                      </button>

                      {confirmDeleteId === selected.id ? (
                        <button
                          type="button"
                          onClick={() => onDeleteConversation(selected.id)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-[#C83E2B] hover:bg-[#A83121] rounded-lg whitespace-nowrap cursor-pointer"
                        >
                          Xác nhận xóa
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(selected.id)}
                          className="p-1.5 text-[#6B7280] hover:text-[#C83E2B] rounded-lg border border-transparent hover:border-[#FECACA] cursor-pointer"
                          title="Xóa hội thoại này"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Personal Note Input */}
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={noteDraft}
                      onChange={(e) => setNoteDraft(e.target.value)}
                      placeholder="Thêm ghi chú cá nhân cho buổi luyện này (ví dụ: Cần chú ý thanh 3, từ vựng gọi đồ)..."
                      className="flex-1 text-xs bg-white border border-[#E2E6EA] focus:border-[#0F6B5E] focus:outline-none rounded-lg px-3 py-2 text-[#374151]"
                    />
                    <button
                      type="button"
                      disabled={savingMeta}
                      onClick={handleSaveMeta}
                      className="px-3 py-2 text-xs font-semibold text-[#374151] bg-white border border-[#D8DFE6] hover:border-[#0F6B5E] rounded-lg whitespace-nowrap cursor-pointer"
                    >
                      {savingMeta ? 'Đang lưu...' : 'Lưu ghi chú'}
                    </button>
                  </div>
                </div>

                {/* Review Sub-tabs */}
                <div className="px-5 sm:px-6 py-3 border-b border-[#ECEFF2] flex flex-wrap items-center justify-between gap-3">
                  <div className="inline-flex items-center p-1 bg-[#ECEFF2] rounded-lg">
                    <button
                      type="button"
                      onClick={() => setReviewTab('transcript')}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                        reviewTab === 'transcript'
                          ? 'bg-white text-[#111827] shadow-xs'
                          : 'text-[#525B66] hover:text-[#111827]'
                      }`}
                    >
                      Bản ghi hội thoại ({selected.turns.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setReviewTab('insights')}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                        reviewTab === 'insights'
                          ? 'bg-white text-[#111827] shadow-xs'
                          : 'text-[#525B66] hover:text-[#111827]'
                      }`}
                    >
                      Tổng kết &amp; Diễn đạt bản xứ
                    </button>
                  </div>

                  {reviewTab === 'transcript' ? (
                    <div className="flex items-center gap-4 text-xs">
                      <label className="inline-flex items-center gap-1.5 text-[#525B66] cursor-pointer">
                        <input
                          type="checkbox"
                          checked={showPinyin}
                          onChange={(e) => setShowPinyin(e.target.checked)}
                          className="accent-[#0F6B5E]"
                        />
                        Pinyin
                      </label>
                      <label className="inline-flex items-center gap-1.5 text-[#525B66] cursor-pointer">
                        <input
                          type="checkbox"
                          checked={showVietnamese}
                          onChange={(e) => setShowVietnamese(e.target.checked)}
                          className="accent-[#0F6B5E]"
                        />
                        Dịch nghĩa
                      </label>
                    </div>
                  ) : (
                    <button
                      type="button"
                      disabled={generatingId === selected.id}
                      onClick={handleGenerateReviewClick}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0F6B5E] hover:underline disabled:opacity-50 whitespace-nowrap cursor-pointer"
                    >
                      {generatingId === selected.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Sparkles className="w-3.5 h-3.5" />
                      )}
                      {selected.review ? 'Phân tích lại tổng kết' : 'Tạo tổng kết luyện tập'}
                    </button>
                  )}
                </div>

                {/* Tab Content */}
                <div className="p-5 sm:p-6 max-h-[580px] overflow-y-auto">
                  {reviewTab === 'transcript' ? (
                    <div className="space-y-5">
                      {selected.turns.map((turn, index) => {
                        const isUser = turn.role === 'user';
                        const normalKey = `saved_${turn.id}_n`;
                        const slowKey = `saved_${turn.id}_s`;
                        return (
                          <div
                            key={turn.id || index}
                            className="pb-5 last:pb-0 border-b last:border-b-0 border-[#F1F3F5]"
                          >
                            <div className="flex items-center justify-between gap-2 mb-1.5">
                              <div className="flex items-center gap-2 text-xs text-[#525B66]">
                                <span
                                  className={`font-semibold ${
                                    isUser ? 'text-[#0F6B5E]' : 'text-[#111827]'
                                  }`}
                                >
                                  {isUser ? 'Bạn' : selected.partnerName}
                                </span>
                                <span aria-hidden="true">·</span>
                                <span className="font-mono tabular-nums text-[11px]">
                                  Lượt {index + 1}
                                </span>
                              </div>

                              <div className="flex items-center gap-3 text-xs">
                                <button
                                  type="button"
                                  onClick={() =>
                                    onPlayTts(normalKey, turn.hanzi, false, selected.voiceName)
                                  }
                                  disabled={playingTtsKey === normalKey}
                                  className="inline-flex items-center gap-1 text-[#374151] hover:text-[#0F6B5E] font-medium cursor-pointer"
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
                                  onClick={() =>
                                    onPlayTts(slowKey, turn.hanzi, true, selected.voiceName)
                                  }
                                  disabled={playingTtsKey === slowKey}
                                  className="text-[#525B66] hover:text-[#0F6B5E] cursor-pointer"
                                >
                                  Chậm
                                </button>
                              </div>
                            </div>

                            <p className="font-hanzi text-[18px] leading-relaxed text-[#111827]">
                              {turn.hanzi}
                            </p>
                            {showPinyin && turn.pinyin && (
                              <p className="text-[13px] text-[#0F6B5E] font-medium mt-1">
                                {turn.pinyin}
                              </p>
                            )}
                            {showVietnamese && turn.vietnamese && (
                              <p className="text-[13px] text-[#525B66] mt-1">{turn.vietnamese}</p>
                            )}

                            {isUser && turn.feedback && !turn.feedback.isNatural && turn.feedback.betterHanzi && (
                              <div className="mt-2.5 p-3 rounded-lg bg-[#FAFBFB] border border-[#E5E9EE] text-xs space-y-1">
                                <span className="font-semibold text-[#92400E]">
                                  Diễn đạt tự nhiên hơn:
                                </span>
                                <p className="font-hanzi text-sm font-semibold text-[#111827]">
                                  {turn.feedback.betterHanzi}
                                </p>
                                {turn.feedback.betterPinyin && (
                                  <p className="text-[#0F6B5E]">{turn.feedback.betterPinyin}</p>
                                )}
                                <p className="text-[#4B5563]">{turn.feedback.explanationVi}</p>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : !selected.review ? (
                    <div className="py-10 text-center max-w-md mx-auto">
                      <Sparkles className="w-7 h-7 text-[#0F6B5E] mx-auto mb-3" />
                      <h3 className="text-base font-bold text-[#111827]">
                        Chưa có bản tổng kết cho hội thoại này
                      </h3>
                      <p className="text-xs text-[#525B66] mt-1.5 leading-relaxed">
                        Hệ thống sẽ phân tích toàn bộ lượt thoại để rút ra điểm tự nhiên, các câu có thể diễn đạt giống người bản xứ hơn và mẫu câu nên lưu vào sổ từ vựng.
                      </p>
                      <button
                        type="button"
                        disabled={generatingId === selected.id}
                        onClick={handleGenerateReviewClick}
                        className="mt-4 inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-[#0F6B5E] hover:bg-[#0B5248] rounded-lg cursor-pointer"
                      >
                        {generatingId === selected.id && (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        )}
                        Tạo tổng kết luyện tập
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-7">
                      {/* Summary */}
                      <div>
                        <h3 className="text-sm font-bold text-[#111827]">Tóm tắt buổi luyện</h3>
                        <p className="text-sm text-[#4B5563] mt-1.5 leading-relaxed">
                          {selected.review.summaryVi}
                        </p>
                      </div>

                      {/* Strengths */}
                      {selected.review.strengthsVi.length > 0 && (
                        <div className="pt-5 border-t border-[#ECEFF2]">
                          <h3 className="text-sm font-bold text-[#111827] mb-2.5">
                            Điểm bạn làm tốt
                          </h3>
                          <ul className="space-y-2">
                            {selected.review.strengthsVi.map((st, idx) => (
                              <li
                                key={idx}
                                className="flex items-start gap-2 text-sm text-[#374151]"
                              >
                                <Check className="w-4 h-4 text-[#0F6B5E] shrink-0 mt-0.5" />
                                <span>{st}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Expression Upgrades */}
                      {selected.review.upgrades.length > 0 && (
                        <div className="pt-5 border-t border-[#ECEFF2]">
                          <h3 className="text-sm font-bold text-[#111827] mb-3">
                            Nâng cấp diễn đạt tự nhiên hơn
                          </h3>
                          <div className="space-y-3">
                            {selected.review.upgrades.map((up, idx) => {
                              const upKey = `upgrade_${selected.id}_${idx}`;
                              return (
                                <div
                                  key={idx}
                                  className="p-4 rounded-lg bg-[#FAFBFB] border border-[#E5E9EE] space-y-2"
                                >
                                  <p className="text-xs text-[#6B7280]">
                                    Cách nói ban đầu:{' '}
                                    <span className="font-hanzi text-[#374151]">{up.original}</span>
                                  </p>
                                  <div className="flex items-start justify-between gap-3">
                                    <div>
                                      <p className="font-hanzi text-base font-semibold text-[#111827]">
                                        {up.naturalHanzi}
                                      </p>
                                      <p className="text-xs text-[#0F6B5E] mt-0.5">
                                        {up.naturalPinyin}
                                      </p>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        onPlayTts(upKey, up.naturalHanzi, false, selected.voiceName)
                                      }
                                      className="inline-flex items-center gap-1 text-xs font-medium text-[#374151] hover:text-[#0F6B5E] shrink-0 cursor-pointer"
                                    >
                                      <Volume2 className="w-3.5 h-3.5" />
                                      Nghe
                                    </button>
                                  </div>
                                  <p className="text-xs text-[#4B5563] leading-relaxed">
                                    {up.explanationVi}
                                  </p>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Key Takeaways */}
                      {selected.review.keyTakeaways.length > 0 && (
                        <div className="pt-5 border-t border-[#ECEFF2]">
                          <h3 className="text-sm font-bold text-[#111827] mb-3">
                            Mẫu câu đáng ghi nhớ
                          </h3>
                          <div className="divide-y divide-[#ECEFF2] border border-[#E5E9EE] rounded-lg">
                            {selected.review.keyTakeaways.map((kt, idx) => {
                              const already = savedPhraseSet.has(kt.hanzi.trim());
                              const ktKey = `kt_${selected.id}_${idx}`;
                              return (
                                <div
                                  key={idx}
                                  className="p-3.5 flex items-start justify-between gap-4 bg-white"
                                >
                                  <div className="min-w-0">
                                    <div className="flex flex-wrap items-baseline gap-2">
                                      <span className="font-hanzi text-base font-semibold text-[#111827]">
                                        {kt.hanzi}
                                      </span>
                                      <span className="text-xs text-[#0F6B5E] font-medium">
                                        {kt.pinyin}
                                      </span>
                                    </div>
                                    <p className="text-xs text-[#4B5563] mt-0.5">{kt.vietnamese}</p>
                                    {kt.usage && (
                                      <p className="text-[11px] text-[#6B7280] mt-1">{kt.usage}</p>
                                    )}
                                  </div>

                                  <div className="flex items-center gap-3 shrink-0 text-xs">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        onPlayTts(ktKey, kt.hanzi, false, selected.voiceName)
                                      }
                                      className="text-[#525B66] hover:text-[#0F6B5E] cursor-pointer"
                                      title="Nghe phát âm"
                                    >
                                      <Volume2 className="w-4 h-4" />
                                    </button>
                                    <button
                                      type="button"
                                      disabled={already}
                                      onClick={() => onSavePhrase(kt, selected.scenarioTitle)}
                                      className={`font-semibold whitespace-nowrap cursor-pointer ${
                                        already
                                          ? 'text-[#0F6B5E]'
                                          : 'text-[#111827] hover:text-[#0F6B5E]'
                                      }`}
                                    >
                                      {already ? 'Đã lưu' : '+ Lưu từ'}
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </>
            )}
          </section>
        </div>
      )}
    </main>
  );
};
