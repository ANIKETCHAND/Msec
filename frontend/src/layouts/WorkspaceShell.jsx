import React, { useState } from 'react';
import { useApp, DEMO_USERS } from '../context/AppContext';
import { api } from '../services/api';
import { PAGE_REGISTRY } from '../utils/pageRegistry';
import ExpandingSearchDock from '../components/ui/expanding-search-dock';
import {
  Shield,
  Bell,
  CheckCircle2,
  RefreshCw,
  LogOut,
  ChevronDown,
  X,
  Menu,
  Layers,
  LayoutDashboard,
  ShieldCheck,
  FileText,
  MoreHorizontal
} from 'lucide-react';

export default function WorkspaceShell({ children }) {
  const {
    currentUser,
    setCurrentUser,
    currentPage,
    setCurrentPage,
    simulationNotice,
    setSimulationNotice,
    resetAllSimulations,
    securityEvents,
    logAudit,
    logout,
    switchUserRole
  } = useApp();

  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [secondaryDropdownOpen, setSecondaryDropdownOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  const handleSignOut = async () => {
    setProfileDropdownOpen(false);
    try {
      await api.logout();
    } catch (err) {
      console.warn('[WorkspaceShell] Logout notice:', err.message);
    }
    if (logAudit) {
      logAudit('USER_LOGOUT', 'AuthSession', currentUser?.email || 'user', 'User signed out from MediShield.');
    }
    if (logout) {
      await logout();
    } else {
      setCurrentUser(null);
      setCurrentPage('landing');
    }
  };

  // Priority 1: The 4 Core Application Workspaces
  const primaryTabs = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'assessment-center', label: 'Assessment Center', icon: Shield },
    { id: 'scan-results', label: 'Scan Results', icon: ShieldCheck },
    { id: 'reports', label: 'Reports', icon: FileText }
  ];

  // Secondary Operational & Governance Tools
  const secondaryPages = [
    { id: 'devices', label: 'Device Inventory' },
    { id: 'security-events', label: 'Security Events' },
    { id: 'incidents', label: 'Incidents' },
    { id: 'ml-detection', label: 'ML Detection' },
    { id: 'topology', label: 'Network Topology' },
    { id: 'tools', label: 'Security Tools' },
    { id: 'response-simulator', label: 'Simulator' },
    { id: 'integrity', label: 'Privacy & Integrity' },
    { id: 'audit-logs', label: 'Audit Trail Ledger' },
    { id: 'settings', label: 'System Settings' }
  ];

  // Search routing handler
  const handleSearchSubmit = (rawQuery) => {
    if (!rawQuery || !rawQuery.trim()) return;
    const q = rawQuery.toLowerCase().trim();

    if (q.includes('dev') || q.includes('pump') || q.includes('vent') || q.includes('ecg')) {
      setCurrentPage('devices');
    } else if (q.includes('cve') || q.includes('scan') || q.includes('assess') || q.includes('nmap')) {
      setCurrentPage('assessment-center');
    } else if (q.includes('topol') || q.includes('vlan') || q.includes('network')) {
      setCurrentPage('topology');
    } else if (q.includes('event') || q.includes('alert') || q.includes('traffic') || q.includes('incident') || q.includes('ticket')) {
      setCurrentPage('security-events');
    } else if (q.includes('tool') || q.includes('sensor') || q.includes('snort')) {
      setCurrentPage('tools');
    } else if (q.includes('audit') || q.includes('hash') || q.includes('chain')) {
      setCurrentPage('audit-logs');
    } else if (q.includes('report') || q.includes('csv') || q.includes('pdf')) {
      setCurrentPage('reports');
    } else if (q.includes('integrity') || q.includes('aes') || q.includes('crypto')) {
      setCurrentPage('integrity');
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

        {/* Right: Status, Search, Notifications & User Persona */}
        <div className="flex items-center gap-3">
          {/* Operational Status */}
          <div className="hidden sm:flex items-center gap-1.5 text-xs text-[#6B7280] font-mono">
            <span className="w-2 h-2 rounded-full bg-[#10B981]" />
            <span>Operational</span>
          </div>

          {/* Expanding Search Dock */}
          <div className="hidden lg:flex items-center shrink-0">
            <ExpandingSearchDock
              onSearch={handleSearchSubmit}
              placeholder="Search assets, CVEs, VLANs, security events..."
            />
          </div>

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

          {/* User Persona Profile Dropdown & Quick Sign Out */}
          <div className="flex items-center gap-1.5">
            <div className="relative">
              <button
                onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                className="flex items-center gap-2 p-1 rounded hover:bg-[#F3F4F6] transition-swiss cursor-pointer"
              >
                <div className="w-6 h-6 rounded bg-[#E6F4FF] text-[#1677FF] border border-[#1677FF]/20 flex items-center justify-center font-semibold text-xs overflow-hidden">
                  {currentUser?.picture ? (
                    <img src={currentUser.picture} alt="" className="w-full h-full object-cover" />
                  ) : (
                    currentUser?.avatar || 'OP'
                  )}
                </div>
                <div className="text-left hidden md:block">
                  <p className="text-xs font-medium text-[#171717] leading-tight truncate max-w-[120px]">{currentUser?.name || 'Operator'}</p>
                  <p className="text-[10px] text-[#6B7280] leading-tight font-mono">{currentUser?.role ? currentUser.role.split(' ')[0] : 'User'}</p>
                </div>
                <ChevronDown className="w-3 h-3 text-[#9CA3AF]" />
              </button>

              {/* Persona Switcher Dropdown */}
              {profileDropdownOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-white border border-[#E5E7EB] rounded-lg shadow-lg p-3 z-50 text-xs animate-fadeIn">
                  <div className="pb-2 border-b border-[#E5E7EB]">
                    <p className="font-semibold text-[#171717]">{currentUser?.name || 'MediShield Operator'}</p>
                    <p className="text-[11px] text-[#6B7280] font-mono">{currentUser?.email || 'operator@medishield.local'}</p>
                    <div className="flex items-center gap-1.5 mt-1">
                      <span className="inline-block px-1.5 py-0.5 rounded bg-[#E6F4FF] text-[#1677FF] font-medium text-[10px]">
                        {currentUser?.role || 'Authenticated'}
                      </span>
                      {currentUser?.authProvider === 'google' && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 font-medium text-[10px]">
                          <svg className="w-2.5 h-2.5" viewBox="0 0 24 24">
                            <path fill="#EA4335" d="M12 5c1.6 0 3 .6 4.1 1.6l3.1-3.1C17.3 1.8 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.4 9 5 12 5z" />
                            <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.8z" />
                            <path fill="#FBBC05" d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.3 0-.8.1-1.6.4-2.3L1.9 7.3C.7 9.7 0 12.3 0 15.2c0 2.9.7 5.5 1.9 7.9l3.7-2.9z" />
                            <path fill="#34A853" d="M12 23.5c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.4-6.4-5.6L1.9 16.1C3.7 19.8 7.5 22.5 12 22.5z" />
                          </svg>
                          <span>Google</span>
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="py-2">
                    <p className="text-[10px] uppercase font-mono text-[#9CA3AF] font-semibold mb-1">Switch RBAC Persona:</p>
                    <div className="space-y-1">
                      <button
                        onClick={() => { switchUserRole('admin'); setProfileDropdownOpen(false); }}
                        className={`w-full text-left px-2 py-1.5 rounded transition-swiss flex items-center justify-between cursor-pointer ${
                          currentUser?.role === 'Administrator' ? 'bg-[#E6F4FF] text-[#1677FF] font-semibold' : 'hover:bg-[#F9FAFB] text-[#171717]'
                        }`}
                      >
                        <span>Dr. Marcus Vance (Admin)</span>
                        {currentUser?.role === 'Administrator' && <CheckCircle2 className="w-3 h-3 text-[#1677FF]" />}
                      </button>
                      <button
                        onClick={() => { switchUserRole('analyst'); setProfileDropdownOpen(false); }}
                        className={`w-full text-left px-2 py-1.5 rounded transition-swiss flex items-center justify-between cursor-pointer ${
                          currentUser?.role === 'Security Analyst' ? 'bg-[#E6F4FF] text-[#1677FF] font-semibold' : 'hover:bg-[#F9FAFB] text-[#171717]'
                        }`}
                      >
                        <span>Sarah Chen (Analyst)</span>
                        {currentUser?.role === 'Security Analyst' && <CheckCircle2 className="w-3 h-3 text-[#1677FF]" />}
                      </button>
                      <button
                        onClick={() => { switchUserRole('doctor'); setProfileDropdownOpen(false); }}
                        className={`w-full text-left px-2 py-1.5 rounded transition-swiss flex items-center justify-between cursor-pointer ${
                          currentUser?.role === 'Doctor Demo' ? 'bg-[#E6F4FF] text-[#1677FF] font-semibold' : 'hover:bg-[#F9FAFB] text-[#171717]'
                        }`}
                      >
                        <span>Dr. Elena Rostova (Doctor)</span>
                        {currentUser?.role === 'Doctor Demo' && <CheckCircle2 className="w-3 h-3 text-[#1677FF]" />}
                      </button>
                    </div>
                  </div>

                  {/* Prominent Sign Out Button & Options */}
                  <div className="pt-2.5 mt-1 border-t border-[#E5E7EB] space-y-2">
                    <button
                      type="button"
                      onClick={handleSignOut}
                      className="w-full py-2 px-3 rounded-md bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 hover:border-rose-300 font-semibold text-xs flex items-center justify-center gap-2 transition-swiss cursor-pointer shadow-xs"
                    >
                      <LogOut className="w-3.5 h-3.5 text-rose-600" />
                      <span>Sign Out</span>
                    </button>

                    <div className="flex items-center justify-between pt-1 text-[11px] text-[#6B7280] font-mono">
                      <button
                        type="button"
                        onClick={() => { resetAllSimulations(); setProfileDropdownOpen(false); }}
                        className="hover:text-[#171717] flex items-center gap-1 transition-swiss cursor-pointer"
                      >
                        <RefreshCw className="w-3 h-3" /> Reset Demo
                      </button>
                      <button
                        type="button"
                        onClick={() => { setCurrentPage('landing'); setProfileDropdownOpen(false); }}
                        className="hover:text-[#1677FF] transition-swiss cursor-pointer"
                      >
                        Landing Page &rarr;
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Quick Sign Out Icon in Header */}
            <button
              type="button"
              onClick={handleSignOut}
              title="Sign Out of MediShield"
              className="p-1.5 rounded hover:bg-rose-50 text-[#6B7280] hover:text-rose-600 border border-transparent hover:border-rose-200 transition-swiss cursor-pointer"
            >
              <LogOut className="w-4 h-4 stroke-[1.75]" />
            </button>
          </div>
        </div>
      </header>

      {/* 2. CORE WORKFLOW NAVIGATION BAR */}
      <nav className="h-11 bg-white border-b border-[#E5E7EB] px-4 sm:px-6 flex items-center justify-between shrink-0 z-30 select-none">
        {/* The 4 Main Workspaces */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {primaryTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = currentPage === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => {
                  setCurrentPage(tab.id);
                  setSecondaryDropdownOpen(false);
                }}
                className={`
                  px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-2 transition-all cursor-pointer
                  ${isActive
                    ? 'bg-[#1677FF] text-white font-semibold shadow-xs'
                    : 'text-[#4B5563] hover:text-[#171717] hover:bg-[#F3F4F6]'
                  }
                `}
              >
                <Icon className="w-3.5 h-3.5 stroke-[2]" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Secondary Operations Dropdown */}
        <div className="relative">
          <button
            onClick={() => setSecondaryDropdownOpen(!secondaryDropdownOpen)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-[#6B7280] hover:text-[#171717] hover:bg-[#F3F4F6] rounded-md transition-swiss cursor-pointer"
          >
            <MoreHorizontal className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">More Operations</span>
            <ChevronDown className="w-3 h-3" />
          </button>

          {secondaryDropdownOpen && (
            <div className="absolute right-0 mt-1 w-52 bg-white border border-[#E5E7EB] rounded-lg shadow-lg py-1.5 z-50 text-xs animate-fadeIn">
              <div className="px-3 py-1 border-b border-[#E5E7EB] text-[10px] uppercase font-mono text-[#9CA3AF] font-semibold">
                Platform Operations
              </div>
              {secondaryPages.map((sec) => (
                <button
                  key={sec.id}
                  onClick={() => {
                    setCurrentPage(sec.id);
                    setSecondaryDropdownOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2 flex items-center justify-between transition-swiss hover:bg-[#F9FAFB] cursor-pointer ${
                    currentPage === sec.id ? 'text-[#1677FF] font-semibold bg-blue-50/50' : 'text-[#374151]'
                  }`}
                >
                  <span>{sec.label}</span>
                  {currentPage === sec.id && <CheckCircle2 className="w-3 h-3 text-[#1677FF]" />}
                </button>
              ))}
            </div>
          )}
        </div>
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

    </div>
  );
}
