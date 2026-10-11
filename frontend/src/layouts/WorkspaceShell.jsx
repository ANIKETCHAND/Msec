import React, { useState } from 'react';
import { useApp, DEMO_USERS } from '../context/AppContext';
import { PAGE_REGISTRY } from '../utils/pageRegistry';
import {
  Shield,
  Search,
  Bell,
  CheckCircle2,
  RefreshCw,
  LogOut,
  ChevronDown,
  Sparkles,
  X,
  Menu,
  Layers
} from 'lucide-react';

export default function WorkspaceShell({ children }) {
  const {
    currentUser,
    setCurrentUser,
    currentPage,
    setCurrentPage,
    simulationNotice,
    setSimulationNotice,
    triggerSimulation,
    resetAllSimulations,
    securityEvents
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [simulationModalOpen, setSimulationModalOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  // Swiss categorized navigation groups following the primary guided workflow
  const navCategories = [
    {
      name: 'ASSESSMENT & REPORTS',
      items: ['assessment-center', 'reports']
    },
    {
      name: 'MONITORING & INCIDENTS',
      items: ['security-events', 'incidents']
    },
    {
      name: 'ASSETS & OPERATIONS',
      items: ['devices', 'audit-logs', 'dashboard']
    },
    {
      name: 'SECURITY ARCHITECTURE',
      items: ['topology', 'ml-detection', 'integrity', 'tools', 'response-simulator', 'settings']
    }
  ];

  // Search routing handler
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    const q = searchQuery.toLowerCase().trim();

    if (q.includes('dev') || q.includes('pump') || q.includes('vent') || q.includes('ecg')) {
      setCurrentPage('devices');
    } else if (q.includes('cve') || q.includes('scan') || q.includes('assess') || q.includes('nmap')) {
      setCurrentPage('assessment-center');
    } else if (q.includes('topol') || q.includes('vlan') || q.includes('network')) {
      setCurrentPage('topology');
    } else if (q.includes('event') || q.includes('alert') || q.includes('traffic')) {
      setCurrentPage('security-events');
    } else if (q.includes('incident') || q.includes('ticket')) {
      setCurrentPage('incidents');
    } else if (q.includes('audit') || q.includes('hash') || q.includes('chain')) {
      setCurrentPage('audit-logs');
    } else if (q.includes('report') || q.includes('csv') || q.includes('pdf')) {
      setCurrentPage('reports');
    } else {
      setCurrentPage('security-events');
    }
  };

  const activeMeta = PAGE_REGISTRY[currentPage] || PAGE_REGISTRY.dashboard;

  return (
    <div className="h-screen w-screen bg-[#F5F6F8] text-[#171717] font-sans flex flex-col overflow-hidden">
      {/* 1. COMPACT TOP APPLICATION SHELL HEADER */}
      <header className="h-14 bg-white border-b border-[#E5E7EB] px-4 sm:px-6 flex items-center justify-between shrink-0 z-40 select-none">
        {/* Left: Brand Identity */}
        <div className="flex items-center gap-3">
          <div
            onClick={() => setCurrentPage('dashboard')}
            className="flex items-center gap-2 cursor-pointer group"
          >
            <div className="w-7 h-7 rounded bg-[#1677FF] text-white flex items-center justify-center font-bold text-xs shadow-xs">
              <Shield className="w-4 h-4 stroke-[2.25]" />
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="font-semibold text-sm text-[#171717] tracking-tight">
                MediShield
              </span>
              <span className="text-[11px] font-mono text-[#6B7280] hidden sm:inline">
                IoMT Platform
              </span>
            </div>
          </div>

          <div className="h-4 w-[1px] bg-[#E5E7EB] mx-1 hidden sm:block" />

          {/* Active Workspace Label in Header */}
          <div className="text-xs text-[#6B7280] font-medium hidden md:flex items-center gap-1.5">
            <span className="text-[#9CA3AF] uppercase text-[10px] font-mono">{activeMeta.category}</span>
            <span>/</span>
            <span className="text-[#171717]">{activeMeta.title}</span>
          </div>
        </div>

        {/* Center: Search Field */}
        <form onSubmit={handleSearchSubmit} className="max-w-md w-full mx-4 hidden lg:block">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search assets, CVEs, VLANs, incidents..."
              className="w-full bg-[#F9FAFB] hover:bg-white focus:bg-white text-xs text-[#171717] placeholder-[#9CA3AF] pl-8 pr-3 py-1.5 rounded border border-[#E5E7EB] focus:border-[#1677FF] focus:outline-none focus:ring-1 focus:ring-[#1677FF]/20 transition-swiss font-mono"
            />
          </div>
        </form>

        {/* Right: Status, Simulation, Notifications & User Persona */}
        <div className="flex items-center gap-3">
          {/* Operational Status */}
          <div className="hidden sm:flex items-center gap-1.5 text-xs text-[#6B7280] font-mono">
            <span className="w-2 h-2 rounded-full bg-[#10B981]" />
            <span>Operational</span>
          </div>

          {/* Quick Simulation Trigger */}
          <button
            onClick={() => setSimulationModalOpen(true)}
            title="Safe IoMT Simulation Scenarios"
            className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#F9FAFB] hover:bg-[#F3F4F6] text-[#171717] border border-[#E5E7EB] text-xs font-medium transition-swiss"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#F59E0B]" />
            <span className="hidden sm:inline">Simulation</span>
          </button>

          {/* Notifications Button */}
          <div className="relative">
            <button
              onClick={() => setNotificationsOpen(!notificationsOpen)}
              title="Recent Security Alerts"
              className="p-1.5 rounded hover:bg-[#F3F4F6] text-[#6B7280] hover:text-[#171717] transition-swiss relative"
            >
              <Bell className="w-4 h-4 stroke-[1.75]" />
              {securityEvents.filter(e => e.status === 'open').length > 0 && (
                <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-[#EF4444]" />
              )}
            </button>

            {/* Notifications Dropdown */}
            {notificationsOpen && (
              <div className="absolute right-0 mt-2 w-72 bg-white border border-[#E5E7EB] rounded-lg shadow-md p-3 z-50 text-xs">
                <div className="flex items-center justify-between pb-2 border-b border-[#E5E7EB] mb-2 font-medium">
                  <span>Recent Security Events</span>
                  <span className="text-[10px] text-[#6B7280]">{securityEvents.length} total</span>
                </div>
                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {securityEvents.slice(0, 3).map(e => (
                    <div
                      key={e.id}
                      onClick={() => { setCurrentPage('security-events'); setNotificationsOpen(false); }}
                      className="p-2 rounded hover:bg-[#F9FAFB] cursor-pointer border border-[#F3F4F6] transition-swiss"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-[#171717] truncate">{e.ruleName}</span>
                        <span className="text-[10px] uppercase font-mono text-[#EF4444] font-semibold">{e.severity}</span>
                      </div>
                      <p className="text-[11px] text-[#6B7280] truncate mt-0.5">{e.deviceId} • {e.timestamp}</p>
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => { setCurrentPage('security-events'); setNotificationsOpen(false); }}
                  className="w-full mt-2 text-center text-[#1677FF] hover:underline font-medium text-[11px] pt-1"
                >
                  View All Events &rarr;
                </button>
              </div>
            )}
          </div>

          <div className="h-4 w-[1px] bg-[#E5E7EB]" />

          {/* User Persona Profile Dropdown */}
          <div className="relative">
            <button
              onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
              className="flex items-center gap-2 p-1 rounded hover:bg-[#F3F4F6] transition-swiss"
            >
              <div className="w-6 h-6 rounded bg-[#E6F4FF] text-[#1677FF] border border-[#1677FF]/20 flex items-center justify-center font-semibold text-xs">
                {currentUser.avatar || 'OP'}
              </div>
              <div className="text-left hidden md:block">
                <p className="text-xs font-medium text-[#171717] leading-tight truncate max-w-[120px]">{currentUser.name}</p>
                <p className="text-[10px] text-[#6B7280] leading-tight font-mono">{currentUser.role.split(' ')[0]}</p>
              </div>
              <ChevronDown className="w-3 h-3 text-[#9CA3AF]" />
            </button>

            {/* Persona Switcher Dropdown */}
            {profileDropdownOpen && (
              <div className="absolute right-0 mt-2 w-64 bg-white border border-[#E5E7EB] rounded-lg shadow-md p-3 z-50 text-xs">
                <div className="pb-2 border-b border-[#E5E7EB]">
                  <p className="font-semibold text-[#171717]">{currentUser.name}</p>
                  <p className="text-[11px] text-[#6B7280] font-mono">{currentUser.email}</p>
                  <span className="mt-1 inline-block px-1.5 py-0.5 rounded bg-[#E6F4FF] text-[#1677FF] font-medium text-[10px]">
                    {currentUser.role}
                  </span>
                </div>

                <div className="py-2">
                  <p className="text-[10px] uppercase font-mono text-[#9CA3AF] font-semibold mb-1">Switch RBAC Persona:</p>
                  <div className="space-y-1">
                    <button
                      onClick={() => { setCurrentUser(DEMO_USERS.admin); setProfileDropdownOpen(false); }}
                      className={`w-full text-left px-2 py-1.5 rounded transition-swiss flex items-center justify-between ${
                        currentUser.role === 'Administrator' ? 'bg-[#E6F4FF] text-[#1677FF] font-semibold' : 'hover:bg-[#F9FAFB] text-[#171717]'
                      }`}
                    >
                      <span>Dr. Marcus Vance (Admin)</span>
                      {currentUser.role === 'Administrator' && <CheckCircle2 className="w-3 h-3 text-[#1677FF]" />}
                    </button>
                    <button
                      onClick={() => { setCurrentUser(DEMO_USERS.analyst); setProfileDropdownOpen(false); }}
                      className={`w-full text-left px-2 py-1.5 rounded transition-swiss flex items-center justify-between ${
                        currentUser.role === 'Security Analyst' ? 'bg-[#E6F4FF] text-[#1677FF] font-semibold' : 'hover:bg-[#F9FAFB] text-[#171717]'
                      }`}
                    >
                      <span>Sarah Chen (Analyst)</span>
                      {currentUser.role === 'Security Analyst' && <CheckCircle2 className="w-3 h-3 text-[#1677FF]" />}
                    </button>
                    <button
                      onClick={() => { setCurrentUser(DEMO_USERS.doctor); setProfileDropdownOpen(false); }}
                      className={`w-full text-left px-2 py-1.5 rounded transition-swiss flex items-center justify-between ${
                        currentUser.role === 'Doctor Demo' ? 'bg-[#E6F4FF] text-[#1677FF] font-semibold' : 'hover:bg-[#F9FAFB] text-[#171717]'
                      }`}
                    >
                      <span>Dr. Elena Rostova (Doctor)</span>
                      {currentUser.role === 'Doctor Demo' && <CheckCircle2 className="w-3 h-3 text-[#1677FF]" />}
                    </button>
                  </div>
                </div>

                <div className="pt-2 border-t border-[#E5E7EB] flex items-center justify-between">
                  <button
                    onClick={() => { resetAllSimulations(); setProfileDropdownOpen(false); }}
                    className="text-[11px] text-[#6B7280] hover:text-[#171717] flex items-center gap-1 font-mono"
                  >
                    <RefreshCw className="w-3 h-3" /> Reset Demo
                  </button>
                  <button
                    onClick={() => { setCurrentPage('login'); setProfileDropdownOpen(false); }}
                    className="text-[11px] text-[#EF4444] hover:underline flex items-center gap-1"
                  >
                    <LogOut className="w-3 h-3" /> Log Out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* 2. COMPACT CATEGORY NAVIGATION STRIP */}
      <nav className="h-10 bg-white border-b border-[#E5E7EB] px-4 sm:px-6 flex items-center gap-6 overflow-x-auto scrollbar-none shrink-0 z-30 select-none">
        {navCategories.map((cat) => (
          <div key={cat.name} className="flex items-center gap-1 shrink-0">
            <span className="text-[10px] font-mono text-[#9CA3AF] font-semibold tracking-wider uppercase mr-1 hidden lg:inline">
              {cat.name}:
            </span>
            {cat.items.map((pageId) => {
              const meta = PAGE_REGISTRY[pageId];
              if (!meta) return null;
              const Icon = meta.icon;
              const isActive = currentPage === pageId;

              return (
                <button
                  key={pageId}
                  onClick={() => setCurrentPage(pageId)}
                  className={`
                    px-2.5 py-1 rounded text-xs font-medium flex items-center gap-1.5 transition-swiss
                    ${isActive
                      ? 'bg-[#1677FF] text-white font-semibold shadow-xs'
                      : 'text-[#6B7280] hover:text-[#171717] hover:bg-[#F3F4F6]'
                    }
                  `}
                >
                  <Icon className="w-3 h-3 stroke-[2]" />
                  <span>{meta.title}</span>
                </button>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Simulation Feedback Notice */}
      {simulationNotice && (
        <div className="bg-[#E6F4FF] border-b border-[#B5D8FE] px-6 py-2 flex items-center justify-between text-xs text-[#0958D9] shrink-0 font-medium">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#1677FF]" />
            <span>{simulationNotice}</span>
          </div>
          <button
            onClick={() => setSimulationNotice(null)}
            className="text-[#6B7280] hover:text-[#171717]"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 4. MAIN WORKSPACE AREA WITH ACTIVE PAGE CONTENT */}
      <main className="flex-1 p-3 sm:p-5 overflow-hidden flex flex-col min-h-0 bg-[#F5F6F8]">
        {children}
      </main>

      {/* Safe Simulation Trigger Modal */}
      {simulationModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white border border-[#E5E7EB] rounded-lg max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#E5E7EB]">
              <div className="flex items-center gap-2 text-[#171717] font-semibold text-sm">
                <Sparkles className="w-4 h-4 text-[#F59E0B]" />
                <span>IoMT Safe Simulation Lab</span>
              </div>
              <button
                onClick={() => setSimulationModalOpen(false)}
                className="text-[#9CA3AF] hover:text-[#171717]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-[#6B7280] leading-relaxed">
              Trigger authorized synthetic attack telemetry to test passive IDS heuristics, alert correlation, and incident generation.
            </p>

            <div className="grid grid-cols-2 gap-2.5 pt-1">
              <button
                onClick={() => { triggerSimulation('auth_spike'); setSimulationModalOpen(false); }}
                className="p-3 bg-[#F9FAFB] hover:bg-[#F3F4F6] border border-[#E5E7EB] rounded-md text-left transition-swiss"
              >
                <p className="text-xs font-semibold text-[#EF4444]">Brute Force Auth</p>
                <p className="text-[11px] text-[#6B7280] mt-0.5">Credential spray alert</p>
              </button>
              <button
                onClick={() => { triggerSimulation('traffic_spike'); setSimulationModalOpen(false); }}
                className="p-3 bg-[#F9FAFB] hover:bg-[#F3F4F6] border border-[#E5E7EB] rounded-md text-left transition-swiss"
              >
                <p className="text-xs font-semibold text-[#F59E0B]">Traffic Ingress</p>
                <p className="text-[11px] text-[#6B7280] mt-0.5">Surge telemetry burst</p>
              </button>
              <button
                onClick={() => { triggerSimulation('telemetry_drop'); setSimulationModalOpen(false); }}
                className="p-3 bg-[#F9FAFB] hover:bg-[#F3F4F6] border border-[#E5E7EB] rounded-md text-left transition-swiss"
              >
                <p className="text-xs font-semibold text-[#1677FF]">Telemetry Drop</p>
                <p className="text-[11px] text-[#6B7280] mt-0.5">Device heartbeat loss</p>
              </button>
              <button
                onClick={() => { triggerSimulation('firmware_tamper'); setSimulationModalOpen(false); }}
                className="p-3 bg-[#F9FAFB] hover:bg-[#F3F4F6] border border-[#E5E7EB] rounded-md text-left transition-swiss"
              >
                <p className="text-xs font-semibold text-purple-600">Firmware Tamper</p>
                <p className="text-[11px] text-[#6B7280] mt-0.5">SHA-256 hash drift</p>
              </button>
            </div>

            <div className="pt-3 border-t border-[#E5E7EB] flex justify-end">
              <button
                onClick={() => setSimulationModalOpen(false)}
                className="px-4 py-1.5 bg-[#F9FAFB] hover:bg-[#F3F4F6] text-xs font-medium rounded border border-[#E5E7EB] text-[#171717]"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
