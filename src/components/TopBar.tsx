import React from 'react';
import { AppView } from '../types';

interface TopBarProps {
  activeView: AppView;
  onSelectView: (view: AppView) => void;
  onStartFreshSession: () => void;
  savedCount: number;
  vocabCount: number;
}

export const TopBar: React.FC<TopBarProps> = ({
  activeView,
  onSelectView,
  onStartFreshSession,
  savedCount,
  vocabCount,
}) => {
  const navItems: Array<{ id: AppView; label: string; count?: number }> = [
    { id: 'practice', label: 'Luyện nói' },
    { id: 'scenarios', label: 'Chủ đề' },
    { id: 'saved', label: 'Hội thoại đã lưu', count: savedCount > 0 ? savedCount : undefined },
    { id: 'vocabulary', label: 'Sổ từ vựng', count: vocabCount > 0 ? vocabCount : undefined },
  ];

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-sm border-b border-[#E2E6EA]">
      <div className="max-w-[1320px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-8">
        {/* Zone 1: Single-line Brand Wordmark */}
        <button
          type="button"
          onClick={() => onSelectView('practice')}
          className="text-lg font-bold tracking-tight text-[#111827] hover:text-[#0F6B5E] transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#0F6B5E]"
        >
          YǔChá <span className="font-hanzi font-semibold text-[#0F6B5E] ml-0.5">语茶</span>
        </button>

        {/* Zone 2: Clean Typography Navigation Links */}
        <nav className="hidden md:flex items-center gap-7" aria-label="Điều hướng chính">
          {navItems.map((item) => {
            const active = activeView === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectView(item.id)}
                className={`relative py-5 text-sm font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-[#0F6B5E] ${
                  active ? 'text-[#0F6B5E]' : 'text-[#525B66] hover:text-[#111827]'
                }`}
              >
                {item.label}
                {item.count !== undefined && (
                  <span className="ml-1.5 text-xs font-mono tabular-nums text-[#6B7280]">
                    ({item.count})
                  </span>
                )}
                {active && (
                  <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#0F6B5E]" />
                )}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: Single Primary Action */}
        <div className="flex items-center shrink-0">
          <button
            type="button"
            onClick={onStartFreshSession}
            className="px-4 py-2 text-sm font-semibold text-white bg-[#0F6B5E] hover:bg-[#0B5248] rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0F6B5E]"
          >
            Phiên mới
          </button>
        </div>
      </div>

      {/* Compact single-row mobile navigation */}
      <nav
        className="md:hidden flex items-center justify-around border-t border-[#ECEFF2] px-2 bg-white"
        aria-label="Điều hướng di động"
      >
        {navItems.map((item) => {
          const active = activeView === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectView(item.id)}
              className={`py-2.5 px-2 text-xs font-medium whitespace-nowrap shrink-0 border-b-2 transition-colors ${
                active
                  ? 'border-[#0F6B5E] text-[#0F6B5E]'
                  : 'border-transparent text-[#525B66]'
              }`}
            >
              {item.label}
              {item.count !== undefined ? ` (${item.count})` : ''}
            </button>
          );
        })}
      </nav>
    </header>
  );
};
