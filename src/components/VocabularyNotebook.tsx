import React, { useMemo, useState } from 'react';
import { BookOpen, Check, Loader2, Plus, Search, Trash2, Volume2, X } from 'lucide-react';
import { SavedPhrase } from '../types';

interface VocabularyNotebookProps {
  phrases: SavedPhrase[];
  loading: boolean;
  playingTtsKey: string | null;
  onPlayTts: (key: string, text: string, slow?: boolean) => void;
  onAddPhrase: (phrase: {
    hanzi: string;
    pinyin: string;
    vietnamese: string;
    usage?: string;
    scenarioTitle: string;
  }) => Promise<void>;
  onToggleMastered: (id: string, mastered: boolean) => Promise<void>;
  onDeletePhrase: (id: string) => Promise<void>;
}

type VocabFilter = 'all' | 'learning' | 'mastered';

export const VocabularyNotebook: React.FC<VocabularyNotebookProps> = ({
  phrases,
  loading,
  playingTtsKey,
  onPlayTts,
  onAddPhrase,
  onToggleMastered,
  onDeletePhrase,
}) => {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<VocabFilter>('all');
  const [showAddForm, setShowAddForm] = useState(false);
  const [hanzi, setHanzi] = useState('');
  const [pinyin, setPinyin] = useState('');
  const [vietnamese, setVietnamese] = useState('');
  const [usage, setUsage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return phrases.filter((p) => {
      if (filter === 'learning' && p.mastered) return false;
      if (filter === 'mastered' && !p.mastered) return false;
      if (!q) return true;
      return (
        p.hanzi.toLowerCase().includes(q) ||
        p.pinyin.toLowerCase().includes(q) ||
        p.vietnamese.toLowerCase().includes(q) ||
        p.scenarioTitle.toLowerCase().includes(q)
      );
    });
  }, [phrases, filter, search]);

  const masteredCount = useMemo(() => phrases.filter((p) => p.mastered).length, [phrases]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hanzi.trim()) return;
    setSubmitting(true);
    try {
      await onAddPhrase({
        hanzi: hanzi.trim(),
        pinyin: pinyin.trim(),
        vietnamese: vietnamese.trim(),
        usage: usage.trim(),
        scenarioTitle: 'Tự thêm',
      });
      setHanzi('');
      setPinyin('');
      setVietnamese('');
      setUsage('');
      setShowAddForm(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="max-w-[1320px] mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6 border-b border-[#E2E6EA]">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#111827]">
            Sổ mẫu câu khẩu ngữ
          </h1>
          <p className="text-sm text-[#525B66] mt-1.5">
            Tổng hợp {phrases.length} cụm từ giao tiếp tự nhiên đã lưu ·{' '}
            <span className="font-mono tabular-nums text-[#0F6B5E] font-medium">
              {masteredCount}/{phrases.length}
            </span>{' '}
            đã thuộc.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-[#6B7280] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm chữ Hán, Pinyin, nghĩa..."
              className="pl-9 pr-3.5 py-2 text-xs bg-white border border-[#D8DFE6] focus:border-[#0F6B5E] focus:outline-none rounded-lg w-56"
            />
          </div>

          <div className="inline-flex items-center p-1 bg-[#ECEFF2] rounded-lg">
            {(
              [
                { id: 'all', label: 'Tất cả' },
                { id: 'learning', label: 'Đang ôn' },
                { id: 'mastered', label: 'Đã thuộc' },
              ] as const
            ).map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setFilter(opt.id)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                  filter === opt.id
                    ? 'bg-white text-[#111827] shadow-xs'
                    : 'text-[#525B66] hover:text-[#111827]'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setShowAddForm((v) => !v)}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#111827] hover:bg-[#0F6B5E] rounded-lg transition-colors whitespace-nowrap cursor-pointer"
          >
            {showAddForm ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
            {showAddForm ? 'Đóng' : 'Thêm mẫu câu'}
          </button>
        </div>
      </div>

      {/* Manual Add Phrase Form */}
      {showAddForm && (
        <form
          onSubmit={handleSubmit}
          className="mt-6 p-5 bg-white border border-[#E2E6EA] rounded-xl grid grid-cols-1 md:grid-cols-4 gap-3 items-end"
        >
          <div>
            <label className="block text-xs font-semibold text-[#374151] mb-1">Chữ Hán</label>
            <input
              type="text"
              required
              value={hanzi}
              onChange={(e) => setHanzi(e.target.value)}
              placeholder="Ví dụ: 挺不错的"
              className="w-full px-3 py-2 text-sm font-hanzi border border-[#D8DFE6] rounded-lg focus:border-[#0F6B5E] focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#374151] mb-1">Pinyin</label>
            <input
              type="text"
              value={pinyin}
              onChange={(e) => setPinyin(e.target.value)}
              placeholder="tǐng bùcuò de"
              className="w-full px-3 py-2 text-sm border border-[#D8DFE6] rounded-lg focus:border-[#0F6B5E] focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#374151] mb-1">Nghĩa tiếng Việt</label>
            <input
              type="text"
              required
              value={vietnamese}
              onChange={(e) => setVietnamese(e.target.value)}
              placeholder="Khá ổn / Rất được đấy"
              className="w-full px-3 py-2 text-sm border border-[#D8DFE6] rounded-lg focus:border-[#0F6B5E] focus:outline-none"
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={usage}
              onChange={(e) => setUsage(e.target.value)}
              placeholder="Ghi chú ngữ cảnh..."
              className="flex-1 min-w-0 px-3 py-2 text-sm border border-[#D8DFE6] rounded-lg focus:border-[#0F6B5E] focus:outline-none"
            />
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 text-xs font-semibold text-white bg-[#0F6B5E] hover:bg-[#0B5248] rounded-lg whitespace-nowrap shrink-0 cursor-pointer"
            >
              {submitting ? 'Lưu...' : 'Lưu'}
            </button>
          </div>
        </form>
      )}

      {/* List */}
      {loading ? (
        <div className="py-16 flex items-center justify-center gap-2 text-sm text-[#525B66]">
          <Loader2 className="w-4 h-4 animate-spin text-[#0F6B5E]" />
          <span>Đang tải sổ từ vựng...</span>
        </div>
      ) : phrases.length === 0 ? (
        <div className="mt-10 bg-white border border-[#E2E6EA] rounded-xl p-12 text-center max-w-xl mx-auto">
          <BookOpen className="w-8 h-8 text-[#0F6B5E] mx-auto mb-3" />
          <h2 className="text-lg font-bold text-[#111827]">Sổ mẫu câu của bạn đang trống</h2>
          <p className="text-sm text-[#525B66] mt-2 leading-relaxed">
            Trong lúc trò chuyện hoặc xem lại hội thoại đã lưu, nhấn{' '}
            <strong className="text-[#111827]">+ Lưu từ</strong> ở bất kỳ cụm khẩu ngữ nào để lưu lại luyện nghe và ghi nhớ mỗi ngày.
          </p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="mt-8 bg-white border border-[#E2E6EA] rounded-xl p-8 text-center text-sm text-[#525B66]">
          Không có mẫu câu nào khớp với bộ lọc hiện tại.
        </div>
      ) : (
        <section className="mt-6 bg-white border border-[#E2E6EA] rounded-xl overflow-hidden divide-y divide-[#ECEFF2]">
          {filtered.map((item) => {
            const normalKey = `vocab_${item.id}_n`;
            const slowKey = `vocab_${item.id}_s`;
            return (
              <article
                key={item.id}
                className="px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-[#FAFBFB] transition-colors"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-baseline gap-2.5">
                    <h2
                      className={`font-hanzi text-xl font-semibold ${
                        item.mastered ? 'text-[#525B66]' : 'text-[#111827]'
                      }`}
                    >
                      {item.hanzi}
                    </h2>
                    {item.pinyin && (
                      <span className="text-sm font-medium text-[#0F6B5E]">{item.pinyin}</span>
                    )}
                  </div>
                  <p className="text-sm text-[#374151] mt-1">{item.vietnamese}</p>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-[#6B7280] mt-1.5">
                    <span>{item.scenarioTitle}</span>
                    {item.usage && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span>{item.usage}</span>
                      </>
                    )}
                    {item.mastered && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="text-[#0F6B5E] font-medium">Đã thuộc</span>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0 text-xs">
                  <button
                    type="button"
                    onClick={() => onPlayTts(normalKey, item.hanzi, false)}
                    disabled={playingTtsKey === normalKey}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-[#E2E6EA] text-[#374151] hover:border-[#0F6B5E] hover:text-[#0F6B5E] cursor-pointer whitespace-nowrap"
                  >
                    {playingTtsKey === normalKey ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-[#0F6B5E]" />
                    ) : (
                      <Volume2 className="w-3.5 h-3.5" />
                    )}
                    Nghe
                  </button>

                  <button
                    type="button"
                    onClick={() => onPlayTts(slowKey, item.hanzi, true)}
                    disabled={playingTtsKey === slowKey}
                    className="px-2.5 py-1.5 rounded-lg border border-[#E2E6EA] text-[#525B66] hover:border-[#0F6B5E] hover:text-[#0F6B5E] cursor-pointer whitespace-nowrap"
                  >
                    Chậm
                  </button>

                  <button
                    type="button"
                    onClick={() => onToggleMastered(item.id, !item.mastered)}
                    className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border font-semibold cursor-pointer whitespace-nowrap transition-colors ${
                      item.mastered
                        ? 'bg-[#ECF6F4] border-[#0F6B5E]/40 text-[#0F6B5E]'
                        : 'bg-white border-[#E2E6EA] text-[#374151] hover:border-[#0F6B5E]'
                    }`}
                  >
                    <Check className="w-3.5 h-3.5" />
                    {item.mastered ? 'Đã thuộc' : 'Đánh dấu thuộc'}
                  </button>

                  <button
                    type="button"
                    onClick={() => onDeletePhrase(item.id)}
                    className="p-1.5 text-[#6B7280] hover:text-[#C83E2B] cursor-pointer"
                    title="Xóa mẫu câu"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </article>
            );
          })}
        </section>
      )}
    </main>
  );
};
