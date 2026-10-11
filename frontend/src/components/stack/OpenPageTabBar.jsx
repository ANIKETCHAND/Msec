import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { PAGE_REGISTRY } from '../../utils/pageRegistry';
import { X, Plus, Layers, FileText } from 'lucide-react';

export default function OpenPageTabBar() {
  const { currentPage, setCurrentPage, openTabs, closeTab } = useApp();
  const [addMenuOpen, setAddMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const activeTabRef = useRef(null);

  // Close "+ Add Page" dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setAddMenuOpen(false);
      }
    }
    if (addMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [addMenuOpen]);

  // Keep active tab visible in horizontal scroll view
  useEffect(() => {
    if (activeTabRef.current) {
      activeTabRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'nearest'
      });
    }
  }, [currentPage]);

  // Closed pages available to add to stack
  const closedPages = Object.keys(PAGE_REGISTRY).filter(id => !openTabs.includes(id));

  return (
    <div className="h-10 bg-[#F5F6F8] border-b border-[#E5E7EB] px-4 sm:px-6 flex items-center justify-between gap-3 shrink-0 z-20 select-none">
      {/* Horizontal Tabs Container */}
      <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-1 flex-1 min-w-0">
        {openTabs.map((pageId) => {
          const meta = PAGE_REGISTRY[pageId] || { title: pageId, icon: FileText, category: 'GENERAL' };
          const Icon = meta.icon;
          const isActive = currentPage === pageId;
          const isPersistent = pageId === 'dashboard' || openTabs.length <= 1;

          return (
            <div
              key={pageId}
              ref={isActive ? activeTabRef : null}
              onClick={() => setCurrentPage(pageId)}
              title={`${meta.title} (${meta.category})`}
              className={`
                group relative flex items-center gap-2 px-3 py-1.5 rounded-t border text-xs font-medium cursor-pointer transition-swiss shrink-0
                ${isActive
                  ? 'bg-white text-[#171717] border-[#D1D5DB] border-b-white font-semibold shadow-xs -mb-[1px] z-10'
                  : 'bg-[#EDEDF0] hover:bg-[#E5E7EB] text-[#6B7280] hover:text-[#171717] border-transparent hover:border-[#D1D5DB]'
                }
              `}
            >
              {/* Active Tab Blue Accent Indicator */}
              {isActive && (
                <span className="absolute top-0 left-2 right-2 h-[2px] bg-[#1677FF] rounded-full" />
              )}

              <Icon
                className={`w-3.5 h-3.5 stroke-[1.75] ${
                  isActive ? 'text-[#1677FF]' : 'text-[#9CA3AF] group-hover:text-[#6B7280]'
                }`}
              />
              <span className="truncate max-w-[130px] sm:max-w-[180px]">{meta.title}</span>

              {/* Close Button (Hidden on persistent dashboard or single tab) */}
              {!isPersistent && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    closeTab(pageId);
                  }}
                  title={`Close ${meta.title}`}
                  className="ml-1 p-0.5 rounded hover:bg-[#E5E7EB] text-[#9CA3AF] hover:text-[#171717] transition-swiss focus:outline-none focus:ring-1 focus:ring-[#1677FF]"
                  aria-label={`Close ${meta.title}`}
                >
                  <X className="w-3 h-3 stroke-[2]" />
                </button>
              )}
            </div>
          );
        })}

        {/* [+ Add Page] Button & Dropdown */}
        {closedPages.length > 0 && (
          <div className="relative shrink-0" ref={menuRef}>
            <button
              type="button"
              onClick={() => setAddMenuOpen(!addMenuOpen)}
              title="Add workspace page to open tabs"
              className="px-2.5 py-1.5 rounded-t border border-dashed border-[#D1D5DB] hover:border-[#9CA3AF] bg-transparent hover:bg-white text-xs text-[#6B7280] hover:text-[#171717] transition-swiss flex items-center gap-1.5 focus:outline-none focus:ring-1 focus:ring-[#1677FF]"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Page</span>
            </button>

            {addMenuOpen && (
              <div className="absolute left-0 mt-1 w-56 bg-white border border-[#E5E7EB] rounded-lg shadow-md p-1.5 z-50 text-xs">
                <div className="text-[10px] uppercase font-mono text-[#9CA3AF] font-semibold px-2 py-1">
                  Add to Open Tabs
                </div>
                <div className="max-h-56 overflow-y-auto space-y-0.5">
                  {closedPages.map((id) => {
                    const item = PAGE_REGISTRY[id];
                    const ItemIcon = item.icon;
                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() => {
                          setCurrentPage(id);
                          setAddMenuOpen(false);
                        }}
                        className="w-full text-left px-2 py-1.5 rounded hover:bg-[#F3F4F6] text-[#171717] flex items-center gap-2 transition-swiss"
                      >
                        <ItemIcon className="w-3.5 h-3.5 text-[#6B7280] shrink-0" />
                        <div className="truncate">
                          <span className="font-medium">{item.title}</span>
                          <span className="text-[10px] text-[#9CA3AF] ml-1.5 font-mono">({item.category})</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Right: Stack Depth Counter */}
      <div className="hidden md:flex items-center gap-1.5 text-xs text-[#9CA3AF] font-mono shrink-0 pl-2">
        <Layers className="w-3.5 h-3.5" />
        <span>{openTabs.length} open</span>
      </div>
    </div>
  );
}
