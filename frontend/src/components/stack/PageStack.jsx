import React from 'react';
import { useApp } from '../../context/AppContext';
import { PAGE_REGISTRY } from '../../utils/pageRegistry';
import { FileText } from 'lucide-react';

// Re-export PAGE_REGISTRY for backward compatibility
export { PAGE_REGISTRY } from '../../utils/pageRegistry';

export default function PageStack({ children, pageMap }) {
  const { currentPage } = useApp();

  const activeMeta = PAGE_REGISTRY[currentPage] || {
    id: currentPage,
    title: currentPage,
    icon: FileText,
    category: 'WORKSPACE'
  };
  const ActiveIcon = activeMeta.icon;

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* ACTIVE PAGE WORKSPACE CARD (Foreground Document Surface) */}
      <div className="flex-1 min-h-0 bg-white border border-[#E5E7EB] rounded-lg shadow-xs overflow-hidden flex flex-col transition-swiss">
        {/* Active Page Top Title Strip */}
        <div className="px-6 py-3.5 border-b border-[#E5E7EB] flex items-center justify-between bg-white shrink-0 select-none">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded bg-[#E6F4FF] text-[#1677FF]">
              <ActiveIcon className="w-4 h-4 stroke-[2]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono text-[#9CA3AF] uppercase tracking-wider">
                  {activeMeta.category}
                </span>
                <span className="text-xs text-[#D1D5DB]">•</span>
                <span className="text-[10px] font-mono text-[#10B981] font-semibold">Active Document</span>
              </div>
              <h1 className="text-base sm:text-lg font-semibold text-[#171717] tracking-tight">
                {activeMeta.title}
              </h1>
            </div>
          </div>

          <div className="text-xs text-[#6B7280] hidden md:flex items-center gap-2 font-mono">
            <span className="px-2 py-0.5 rounded bg-[#F5F6F8] border border-[#E5E7EB] text-[11px]">
              Swiss Minimalist Workspace
            </span>
          </div>
        </div>

        {/* Dynamic Page Viewport */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-8 bg-white">
          <div className="max-w-[1500px] mx-auto">
            {pageMap[currentPage] || children}
          </div>
        </div>
      </div>
    </div>
  );
}
