import React, { useEffect, useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  LayoutDashboard,
  Server,
  Activity,
  Shield,
  Wrench,
  Network,
  SlidersHorizontal,
  AlertTriangle,
  FileText,
  Brain,
  BarChart3,
  ClipboardList,
  Lock,
  Settings as SettingsIcon,
  X,
  Plus,
  Layers,
  ChevronRight,
  Maximize2
} from 'lucide-react';

// Registry of all functional MediShield pages
export const PAGE_REGISTRY = {
  dashboard: { id: 'dashboard', title: 'Security Dashboard', icon: LayoutDashboard, category: 'OVERVIEW' },
  devices: { id: 'devices', title: 'Device Inventory', icon: Server, category: 'ASSET SECURITY' },
  'device-detail': { id: 'device-detail', title: 'Device Diagnostics', icon: Activity, category: 'ASSET SECURITY' },
  'assessment-center': { id: 'assessment-center', title: 'Assessment Center', icon: Shield, category: 'ASSET SECURITY' },
  topology: { id: 'topology', title: 'Network Topology', icon: Network, category: 'ASSET SECURITY' },
  tools: { id: 'tools', title: 'Security Tools', icon: Wrench, category: 'ASSET SECURITY' },
  'response-simulator': { id: 'response-simulator', title: 'Response Simulator', icon: SlidersHorizontal, category: 'ASSET SECURITY' },
  'security-events': { id: 'security-events', title: 'Security Events', icon: AlertTriangle, category: 'MONITORING' },
  incidents: { id: 'incidents', title: 'Incident Management', icon: FileText, category: 'MONITORING' },
  'ml-detection': { id: 'ml-detection', title: 'ML Threat Engine', icon: Brain, category: 'MONITORING' },
  reports: { id: 'reports', title: 'Security Reports', icon: BarChart3, category: 'GOVERNANCE' },
  'audit-logs': { id: 'audit-logs', title: 'Audit Logs (SHA-256)', icon: ClipboardList, category: 'GOVERNANCE' },
  integrity: { id: 'integrity', title: 'Privacy & Integrity', icon: Lock, category: 'GOVERNANCE' },
  settings: { id: 'settings', title: 'System Settings', icon: SettingsIcon, category: 'SYSTEM' },
};

export default function PageStack({ children, pageMap }) {
  const { currentPage, setCurrentPage } = useApp();
  const [reopenMenuOpen, setReopenMenuOpen] = useState(false);

  // Stack of open page IDs (maximum 5 items to preserve calm workspace)
  const [openStack, setOpenStack] = useState(() => {
    return ['dashboard', currentPage !== 'dashboard' ? currentPage : null].filter(Boolean);
  });

  // Keep openStack and activePage synchronized with currentPage
  useEffect(() => {
    if (!openStack.includes(currentPage)) {
      setOpenStack(prev => {
        const next = [...prev, currentPage];
        // Enforce max 5 open pages by dropping oldest inactive non-dashboard page
        if (next.length > 5) {
          const dropIndex = next.findIndex(p => p !== 'dashboard' && p !== currentPage);
          if (dropIndex !== -1) next.splice(dropIndex, 1);
        }
        return next;
      });
    }

    // Synchronize browser URL history
    try {
      const targetPath = currentPage === 'dashboard' ? '/' : `/${currentPage}`;
      if (window.location.pathname !== targetPath) {
        window.history.pushState({ page: currentPage }, '', targetPath);
      }
    } catch (e) {
      // Ignore if running under restricted iframe environment
    }
  }, [currentPage]);

  // Handle browser back/forward buttons
  useEffect(() => {
    const handlePopState = (e) => {
      const path = window.location.pathname.replace(/^\//, '');
      const matchedPage = PAGE_REGISTRY[path] ? path : 'dashboard';
      setCurrentPage(matchedPage);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [setCurrentPage]);

  // Bring a background page to foreground
  const handleSelectPage = (pageId) => {
    setCurrentPage(pageId);
  };

  // Close a page from the stack
  const handleClosePage = (e, pageId) => {
    e.stopPropagation();
    if (pageId === 'dashboard') return; // Dashboard remains root anchor

    const nextStack = openStack.filter(id => id !== pageId);
    setOpenStack(nextStack);

    // If active page was closed, activate adjacent page or dashboard
    if (currentPage === pageId) {
      const newActive = nextStack[nextStack.length - 1] || 'dashboard';
      setCurrentPage(newActive);
    }
  };

  const activeMeta = PAGE_REGISTRY[currentPage] || PAGE_REGISTRY.dashboard;
  const ActiveIcon = activeMeta.icon;

  // Pages currently open in the stack that are in the background
  const backgroundPages = openStack.filter(id => id !== currentPage);

  // Pages currently closed that can be reopened
  const closedPages = Object.keys(PAGE_REGISTRY).filter(id => !openStack.includes(id));

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* 1. DOCUMENT DECK HEADER STRIPS (Stack Switcher) */}
      <div className="flex items-center justify-between pb-2 border-b border-[#E5E7EB] mb-2">
        {/* Overlapping Deck Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-1">
          {openStack.map((pageId) => {
            const meta = PAGE_REGISTRY[pageId] || { title: pageId, icon: FileText };
            const Icon = meta.icon;
            const isActive = currentPage === pageId;

            return (
              <div
                key={pageId}
                onClick={() => handleSelectPage(pageId)}
                title={`Bring ${meta.title} to foreground`}
                className={`
                  group flex items-center gap-2 px-3 py-1.5 rounded-t-md border text-xs font-medium cursor-pointer transition-swiss select-none
                  ${isActive
                    ? 'bg-white text-[#171717] border-[#D1D5DB] border-b-white shadow-xs z-30 font-semibold'
                    : 'bg-[#F9FAFB] hover:bg-[#F3F4F6] text-[#6B7280] hover:text-[#171717] border-[#E5E7EB] z-10'
                  }
                `}
              >
                <Icon className={`w-3.5 h-3.5 stroke-[1.75] ${isActive ? 'text-[#1677FF]' : 'text-[#9CA3AF]'}`} />
                <span className="truncate max-w-[140px] sm:max-w-[200px]">{meta.title}</span>

                {/* Close Button (Hidden on persistent dashboard) */}
                {pageId !== 'dashboard' && (
                  <button
                    onClick={(e) => handleClosePage(e, pageId)}
                    title={`Close ${meta.title}`}
                    className="ml-1 p-0.5 rounded hover:bg-[#E5E7EB] text-[#9CA3AF] hover:text-[#171717] transition-swiss"
                  >
                    <X className="w-3 h-3 stroke-[2]" />
                  </button>
                )}
              </div>
            );
          })}

          {/* Reopen Closed Pages Menu */}
          {closedPages.length > 0 && (
            <div className="relative">
              <button
                onClick={() => setReopenMenuOpen(!reopenMenuOpen)}
                title="Add page to stack"
                className="px-2 py-1.5 rounded-t-md border border-dashed border-[#D1D5DB] text-xs text-[#6B7280] hover:text-[#171717] hover:border-[#9CA3AF] hover:bg-[#F9FAFB] transition-swiss flex items-center gap-1"
              >
                <Plus className="w-3 h-3" />
                <span className="hidden sm:inline">Add Page</span>
              </button>

              {reopenMenuOpen && (
                <div className="absolute left-0 mt-1 w-56 bg-white border border-[#E5E7EB] rounded-lg shadow-md p-2 z-50 text-xs">
                  <div className="text-[10px] uppercase font-mono text-[#9CA3AF] font-semibold px-2 py-1">
                    Available Workspace Pages
                  </div>
                  <div className="max-h-48 overflow-y-auto space-y-0.5">
                    {closedPages.map(id => {
                      const m = PAGE_REGISTRY[id];
                      const PIcon = m.icon;
                      return (
                        <button
                          key={id}
                          onClick={() => {
                            setCurrentPage(id);
                            setReopenMenuOpen(false);
                          }}
                          className="w-full text-left px-2 py-1.5 rounded hover:bg-[#F3F4F6] text-[#171717] flex items-center gap-2 transition-swiss"
                        >
                          <PIcon className="w-3.5 h-3.5 text-[#6B7280]" />
                          <span className="truncate">{m.title}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Stack Status Counter */}
        <div className="hidden sm:flex items-center gap-2 text-xs text-[#9CA3AF] tabular-nums font-mono pl-3 shrink-0">
          <Layers className="w-3.5 h-3.5" />
          <span>{openStack.length}/5 in Deck</span>
        </div>
      </div>

      {/* 2. ACTIVE PAGE WORKSPACE CARD (Foreground Document Surface) */}
      <div className="flex-1 min-h-0 bg-white border border-[#E5E7EB] rounded-lg shadow-xs overflow-hidden flex flex-col transition-swiss z-20">
        {/* Active Page Top Title Strip */}
        <div className="px-6 py-3.5 border-b border-[#E5E7EB] flex items-center justify-between bg-white shrink-0">
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
              Swiss International Style
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

      {/* 3. VISIBLE BACKGROUND DOCUMENT STRIPS (Overlapping Card Deck) */}
      {backgroundPages.length > 0 && (
        <div className="hidden sm:flex flex-col mt-1 space-y-1 shrink-0 select-none">
          {backgroundPages.map((pageId, index) => {
            const meta = PAGE_REGISTRY[pageId] || { title: pageId, icon: FileText };
            const Icon = meta.icon;
            const indentOffset = (index + 1) * 16;

            return (
              <div
                key={pageId}
                onClick={() => handleSelectPage(pageId)}
                title={`Bring ${meta.title} to foreground`}
                style={{
                  marginLeft: `${indentOffset}px`,
                  marginRight: `${indentOffset}px`
                }}
                className="bg-white hover:bg-[#FAFAFA] border border-[#E5E7EB] hover:border-[#D1D5DB] px-4 py-2 rounded-b-lg shadow-2xs flex items-center justify-between cursor-pointer transition-swiss group text-xs text-[#6B7280] hover:text-[#171717]"
              >
                <div className="flex items-center gap-2.5">
                  <Icon className="w-3.5 h-3.5 text-[#9CA3AF] group-hover:text-[#1677FF] transition-swiss" />
                  <span className="font-medium text-[#171717]">{meta.title}</span>
                  <span className="text-[10px] font-mono text-[#9CA3AF] uppercase">({meta.category})</span>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-[11px] text-[#9CA3AF] group-hover:text-[#1677FF] font-mono transition-swiss flex items-center gap-1">
                    <span>Bring to front</span>
                    <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-swiss" />
                  </span>
                  {pageId !== 'dashboard' && (
                    <button
                      onClick={(e) => handleClosePage(e, pageId)}
                      title={`Close ${meta.title}`}
                      className="p-0.5 rounded hover:bg-[#E5E7EB] text-[#9CA3AF] hover:text-[#171717] transition-swiss"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
