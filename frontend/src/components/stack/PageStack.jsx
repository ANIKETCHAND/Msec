import React from 'react';
import { useApp } from '../../context/AppContext';
import { PAGE_REGISTRY } from '../../utils/pageRegistry';
import { X, ChevronRight } from 'lucide-react';

// Re-export PAGE_REGISTRY for backward compatibility
export { PAGE_REGISTRY } from '../../utils/pageRegistry';

export default function PageStack({ children, pageMap }) {
  const { currentPage, setCurrentPage, openTabs, closeTab } = useApp();

  // Background cards stacked behind the active card (up to 3 background cards).
  // Anchor 'dashboard' as the foundational background card whenever it is not active,
  // preventing it from ever being pushed off the stack by recent tabs.
  const otherTabs = openTabs.filter(id => id !== currentPage);
  const bgCards = otherTabs.includes('dashboard')
    ? ['dashboard', ...otherTabs.filter(id => id !== 'dashboard').slice(-2)]
    : otherTabs.slice(-3);

  const activeMeta = PAGE_REGISTRY[currentPage] || {
    id: currentPage,
    title: currentPage,
    subtitle: 'IoMT Operational Workspace',
    color: '#1677FF',
    category: 'WORKSPACE'
  };

  return (
    <div className="flex-1 min-h-0 flex flex-col relative select-none">
      {/* 1. STACKED BACKGROUND CARDS (Tabs layered one behind another) */}
      {bgCards.map((pageId, index) => {
        const meta = PAGE_REGISTRY[pageId] || {
          title: pageId,
          subtitle: '',
          color: '#1677FF',
          category: 'WORKSPACE'
        };

        // Stack geometry:
        // index 0 is furthest back; each subsequent card is slightly lower and wider
        const depth = bgCards.length - index;
        const horizontalInset = depth * 14; // e.g. 42px, 28px, 14px
        const verticalOffset = index * 36; // 0px, 36px, 72px
        const zIndex = (index + 1) * 10;

        return (
          <div
            key={pageId}
            onClick={() => setCurrentPage(pageId)}
            title={`Switch to ${meta.title}`}
            style={{
              position: 'absolute',
              top: `${verticalOffset}px`,
              left: `${horizontalInset}px`,
              right: `${horizontalInset}px`,
              height: '46px',
              zIndex: zIndex
            }}
            className="group bg-white hover:bg-[#FAFAFA] border border-[#E5E7EB] hover:border-[#D1D5DB] rounded-t-2xl px-5 py-2.5 flex items-center justify-between cursor-pointer transition-swiss shadow-xs"
          >
            {/* Header Content: Colored Diamond, Title, Dot, Subtitle */}
            <div className="flex items-center gap-2 text-xs truncate min-w-0 pr-3">
              <span
                style={{ color: meta.color || '#1677FF' }}
                className="text-[10px] shrink-0 font-mono font-bold"
              >
                ◆
              </span>
              <span className="font-semibold text-[#171717] shrink-0">
                {meta.title}
              </span>
              <span className="text-[#9CA3AF] text-xs font-normal shrink-0">·</span>
              <span className="text-[#6B7280] font-normal truncate">
                {meta.subtitle}
              </span>
            </div>

            {/* Right Side: Category & Close on hover */}
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-[10px] font-mono text-[#9CA3AF] uppercase hidden md:inline">
                {meta.category}
              </span>
              {openTabs.length > 1 && pageId !== 'dashboard' && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    closeTab(pageId);
                  }}
                  title={`Close ${meta.title}`}
                  className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-[#F3F4F6] text-[#9CA3AF] hover:text-[#171717] transition-swiss"
                  aria-label={`Close ${meta.title}`}
                >
                  <X className="w-3.5 h-3.5 stroke-[2]" />
                </button>
              )}
            </div>
          </div>
        );
      })}

      {/* 2. ACTIVE FOREGROUND CARD (Full document panel in front) */}
      <div
        style={{
          marginTop: `${bgCards.length * 36}px`,
          zIndex: (bgCards.length + 1) * 10
        }}
        className="bg-white border border-[#E5E7EB] rounded-2xl shadow-sm flex-1 min-h-0 flex flex-col overflow-hidden transition-swiss"
      >
        {/* Active Card Top Strip */}
        <div className="px-6 py-3.5 border-b border-[#E5E7EB] flex items-center justify-between bg-white shrink-0">
          <div className="flex items-center gap-2.5 text-xs sm:text-sm min-w-0">
            <span
              style={{ color: activeMeta.color || '#1677FF' }}
              className="text-[11px] shrink-0 font-mono font-bold"
            >
              ◆
            </span>
            <span className="font-semibold text-[#171717] text-sm sm:text-base shrink-0">
              {activeMeta.title}
            </span>
            <span className="text-[#9CA3AF] text-xs font-normal shrink-0">·</span>
            <span className="text-[#6B7280] font-normal text-xs sm:text-sm truncate">
              {activeMeta.subtitle}
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[10px] font-mono text-[#9CA3AF] uppercase px-2 py-0.5 bg-[#F9FAFB] rounded border border-[#E5E7EB]">
              {activeMeta.category}
            </span>
            <span className="text-[10px] font-mono text-[#10B981] font-semibold hidden sm:inline px-2 py-0.5 bg-emerald-50 rounded border border-emerald-200">
              Active
            </span>
          </div>
        </div>

        {/* Active Page Viewport */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-8 bg-white">
          <div className="max-w-[1500px] mx-auto">
            {pageMap[currentPage] || children}
          </div>
        </div>
      </div>
    </div>
  );
}
