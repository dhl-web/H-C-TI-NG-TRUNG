import React, { useState } from 'react';
import { ArrowRight, MessageSquareText, Plus, X } from 'lucide-react';
import { HskLevel, Scenario } from '../types';

interface ScenarioHubProps {
  scenarios: Scenario[];
  activeScenarioId: string;
  onSelectScenario: (scenario: Scenario) => void;
  onCreateCustomScenario: (scenario: Scenario) => void;
}

const FILTER_OPTIONS: Array<'Tất cả' | HskLevel> = ['Tất cả', 'HSK 1–2', 'HSK 3–4', 'HSK 5–6'];

export const ScenarioHub: React.FC<ScenarioHubProps> = ({
  scenarios,
  activeScenarioId,
  onSelectScenario,
  onCreateCustomScenario,
}) => {
  const [levelFilter, setLevelFilter] = useState<'Tất cả' | HskLevel>('Tất cả');
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [customTitle, setCustomTitle] = useState('');
  const [customHanzi, setCustomHanzi] = useState('');
  const [customLevel, setCustomLevel] = useState<HskLevel>('HSK 3–4');
  const [customPartnerRole, setCustomPartnerRole] = useState('');
  const [customGoal, setCustomGoal] = useState('');
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});

  const filtered =
    levelFilter === 'Tất cả'
      ? scenarios
      : scenarios.filter((s) => s.recommendedLevel === levelFilter);

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customTitle.trim()) return;
    const created: Scenario = {
      id: `custom_${Date.now()}`,
      title: customTitle.trim(),
      hanziTitle: customHanzi.trim() || '自定义场景',
      category: 'Tình huống tự chọn',
      recommendedLevel: customLevel,
      description:
        customGoal.trim() ||
        'Luyện phản xạ giao tiếp tiếng Trung tự nhiên theo bối cảnh thực tế bạn tự thiết lập.',
      partnerRole:
        customPartnerRole.trim() ||
        'Người bản xứ Trung Quốc thân thiện, trò chuyện tự nhiên đúng với bối cảnh tình huống.',
      userRole: 'Người học tiếng Trung muốn giao tiếp tự nhiên và rõ ý trong tình huống này.',
      openingGoal:
        customGoal.trim() || 'Duy trì cuộc trò chuyện tự nhiên 5–8 lượt bằng tiếng Trung.',
      starterPhrases: [
        {
          hanzi: '你好，不好意思打扰一下。',
          pinyin: 'Nǐ hǎo, bù hǎoyìsi dǎrǎo yīxià.',
          vietnamese: 'Chào bạn, xin lỗi làm phiền một chút.',
        },
        {
          hanzi: '请问这个用中文怎么说比较自然？',
          pinyin: 'Qǐngwèn zhège yòng Zhōngwén zěnme shuō bǐjiào zìrán?',
          vietnamese: 'Cho hỏi câu này nói bằng tiếng Trung thế nào cho tự nhiên?',
        },
      ],
      isCustom: true,
    };
    onCreateCustomScenario(created);
    setShowCustomForm(false);
    setCustomTitle('');
    setCustomHanzi('');
    setCustomPartnerRole('');
    setCustomGoal('');
  };

  return (
    <main className="max-w-[1320px] mx-auto px-4 sm:px-6 py-8">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6 border-b border-[#E2E6EA]">
        <div className="max-w-2xl">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#111827]">
            Chủ đề giao tiếp hàng ngày
          </h1>
          <p className="text-sm text-[#525B66] mt-2 leading-relaxed">
            Chọn một tình huống thực tế gần gũi nhất với nhu cầu hôm nay hoặc tạo bối cảnh riêng để luyện phản xạ nói tiếng Trung tự nhiên.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <div className="inline-flex items-center p-1 bg-[#ECEFF2] rounded-lg" role="group">
            {FILTER_OPTIONS.map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => setLevelFilter(opt)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  levelFilter === opt
                    ? 'bg-white text-[#111827] shadow-xs'
                    : 'text-[#525B66] hover:text-[#111827]'
                }`}
              >
                {opt}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setShowCustomForm((v) => !v)}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#111827] hover:bg-[#0F6B5E] rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            {showCustomForm ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
            {showCustomForm ? 'Đóng biểu mẫu' : 'Tạo tình huống riêng'}
          </button>
        </div>
      </div>

      {/* Optional Custom Scenario Creator */}
      {showCustomForm && (
        <form
          onSubmit={handleCreateSubmit}
          className="mt-6 p-6 bg-white border border-[#E2E6EA] rounded-xl space-y-4"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-[#111827]">Thiết lập tình huống luyện nói riêng</h2>
            <span className="text-xs text-[#525B66]">Bắt đầu luyện ngay sau khi tạo</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#374151] mb-1.5">
                Tên tình huống (Tiếng Việt)
              </label>
              <input
                type="text"
                required
                value={customTitle}
                onChange={(e) => setCustomTitle(e.target.value)}
                placeholder="Ví dụ: Đàm phán đặt hàng với nhà cung cấp"
                className="w-full px-3.5 py-2 text-sm bg-white border border-[#D8DFE6] rounded-lg focus:border-[#0F6B5E] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#374151] mb-1.5">
                Tiêu đề chữ Hán (tùy chọn)
              </label>
              <input
                type="text"
                value={customHanzi}
                onChange={(e) => setCustomHanzi(e.target.value)}
                placeholder="Ví dụ: 和供应商沟通订单"
                className="w-full px-3.5 py-2 text-sm font-hanzi bg-white border border-[#D8DFE6] rounded-lg focus:border-[#0F6B5E] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#374151] mb-1.5">
                Mức độ ngôn ngữ
              </label>
              <select
                value={customLevel}
                onChange={(e) => setCustomLevel(e.target.value as HskLevel)}
                className="w-full px-3.5 py-2 text-sm bg-white border border-[#D8DFE6] rounded-lg focus:border-[#0F6B5E] focus:outline-none"
              >
                <option value="HSK 1–2">HSK 1–2 (Cơ bản)</option>
                <option value="HSK 3–4">HSK 3–4 (Giao tiếp tự nhiên)</option>
                <option value="HSK 5–6">HSK 5–6 (Lưu loát bản xứ)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#374151] mb-1.5">
                Vai trò của đối tác AI
              </label>
              <input
                type="text"
                value={customPartnerRole}
                onChange={(e) => setCustomPartnerRole(e.target.value)}
                placeholder="Ví dụ: Quản lý xưởng sản xuất ở Quảng Châu, nói chuyện thẳng thắn nhưng lịch sự"
                className="w-full px-3.5 py-2 text-sm bg-white border border-[#D8DFE6] rounded-lg focus:border-[#0F6B5E] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#374151] mb-1.5">
                Mục tiêu giao tiếp hôm nay
              </label>
              <input
                type="text"
                value={customGoal}
                onChange={(e) => setCustomGoal(e.target.value)}
                placeholder="Ví dụ: Hỏi giá sỉ, thời gian giao hàng và cách kiểm tra mẫu"
                className="w-full px-3.5 py-2 text-sm bg-white border border-[#D8DFE6] rounded-lg focus:border-[#0F6B5E] focus:outline-none"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setShowCustomForm(false)}
              className="px-4 py-2 text-xs font-semibold text-[#525B66] hover:text-[#111827] cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-semibold text-white bg-[#0F6B5E] hover:bg-[#0B5248] rounded-lg transition-colors cursor-pointer"
            >
              Tạo &amp; bắt đầu luyện
            </button>
          </div>
        </form>
      )}

      {/* Scenario Grid */}
      <section className="mt-7 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map((scene) => {
          const isActive = scene.id === activeScenarioId;
          const showImg = Boolean(scene.imageUrl) && !failedImages[scene.id];

          return (
            <article
              key={scene.id}
              className={`flex flex-col bg-white border rounded-xl overflow-hidden transition-colors ${
                isActive ? 'border-[#0F6B5E]' : 'border-[#E2E6EA] hover:border-[#B8C2CC]'
              }`}
            >
              {/* Visual Header (4:3 Editorial Photo or Structured Typographic Fallback) */}
              <div className="relative aspect-[4/3] bg-[#EEF2F4] overflow-hidden border-b border-[#ECEFF2]">
                {showImg ? (
                  <img
                    src={scene.imageUrl}
                    alt={`${scene.title} — ${scene.hanziTitle}`}
                    referrerPolicy="no-referrer"
                    onError={() =>
                      setFailedImages((prev) => ({
                        ...prev,
                        [scene.id]: true,
                      }))
                    }
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center bg-gradient-to-br from-[#EEF4F2] to-[#E6ECEF]">
                    <MessageSquareText className="w-7 h-7 text-[#0F6B5E] mb-3" />
                    <span className="font-hanzi text-2xl font-semibold text-[#111827]">
                      {scene.hanziTitle}
                    </span>
                    <span className="text-xs text-[#525B66] mt-1.5">{scene.category}</span>
                  </div>
                )}
              </div>

              {/* Card Body — Clean Unboxed Metadata */}
              <div className="p-5 flex flex-col flex-1">
                <div className="flex items-center gap-2 text-xs text-[#525B66]">
                  <span>{scene.category}</span>
                  <span aria-hidden="true">·</span>
                  <span>{scene.recommendedLevel}</span>
                  {isActive && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span className="font-semibold text-[#0F6B5E]">Đang chọn</span>
                    </>
                  )}
                </div>

                <h2 className="mt-2 text-lg font-bold text-[#111827] leading-snug">
                  {scene.title}
                </h2>
                <p className="font-hanzi text-sm text-[#0F6B5E] font-medium mt-0.5">
                  {scene.hanziTitle}
                </p>

                <p className="mt-2.5 text-sm text-[#525B66] leading-relaxed flex-1">
                  {scene.description}
                </p>

                <div className="mt-4 pt-3.5 border-t border-[#ECEFF2] flex items-center justify-between gap-3">
                  <span className="text-xs text-[#6B7280] truncate">
                    {scene.starterPhrases.length} mẫu câu gợi ý
                  </span>
                  <button
                    type="button"
                    onClick={() => onSelectScenario(scene)}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0F6B5E] hover:text-[#0B5248] whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    Luyện tình huống này
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </section>
    </main>
  );
};
