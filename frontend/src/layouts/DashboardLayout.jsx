import React, { useState } from 'react';
import { useApp, DEMO_USERS } from '../context/AppContext';
import {
  ShieldAlert,
  LayoutDashboard,
  Server,
  Activity,
  AlertTriangle,
  FileText,
  Brain,
  Lock,
  ClipboardList,
  BarChart3,
  Settings as SettingsIcon,
  LogOut,
  ChevronRight,
  Sparkles,
  RefreshCw,
  UserCheck,
  CheckCircle2,
  X,
  Menu,
  Shield,
  Network,
  Wrench,
  SlidersHorizontal
} from 'lucide-react';

export default function DashboardLayout({ children }) {
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

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [simulationModalOpen, setSimulationModalOpen] = useState(false);

  const navItems = [
    { id: 'dashboard', label: 'Security Dashboard', icon: LayoutDashboard },
    { id: 'devices', label: 'Device Inventory', icon: Server },
    { id: 'topology', label: 'Network Topology', icon: Network },
    { id: 'assessment-center', label: 'Assessment Center', icon: Shield },
    { id: 'tools', label: 'Security Tools', icon: Wrench },
    { id: 'response-simulator', label: 'Response Simulator', icon: SlidersHorizontal },
    { id: 'security-events', label: 'Security Events', icon: AlertTriangle, badge: securityEvents.filter(e => e.status === 'open').length },
    { id: 'incidents', label: 'Incident Management', icon: FileText },
    { id: 'ml-detection', label: 'ML Detection Overview', icon: Brain },
    { id: 'integrity', label: 'Privacy & Integrity', icon: Lock },
    { id: 'audit-logs', label: 'Audit Logs', icon: ClipboardList },
    { id: 'reports', label: 'Security Reports', icon: BarChart3 },
    { id: 'settings', label: 'System Settings', icon: SettingsIcon },
  ];

  return (
    <div className="flex h-screen bg-navy-950 text-slate-100 font-sans overflow-hidden">
      {/* Sidebar for Desktop */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-navy-900 border-r border-navy-800 flex flex-col justify-between transition-transform duration-200 ease-in-out
        md:translate-x-0 md:static md:inset-auto
        ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Brand Header */}
        <div>
          <div className="p-5 border-b border-navy-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-mediblue-500/10 border border-mediblue-500/30 rounded-xl">
                <ShieldAlert className="w-6 h-6 text-mediblue-500" />
              </div>
              <div>
                <h1 className="font-bold text-lg text-white tracking-tight flex items-center gap-1.5">
                  MediShield
                  <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-mediblue-500/20 text-mediblue-400 border border-mediblue-500/30">
                    IoMT
                  </span>
                </h1>
                <p className="text-[11px] text-slate-400">Cybersecurity Platform</p>
              </div>
            </div>
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="md:hidden text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Items */}
          <nav className="p-3 space-y-1 overflow-y-auto max-h-[calc(100vh-210px)]">
            <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              Operations & Monitoring
            </div>
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentPage === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setCurrentPage(item.id);
                    setMobileMenuOpen(false);
                  }}
                  className={`
                    w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition
                    ${isActive
                      ? 'bg-mediblue-600/20 text-mediblue-400 border border-mediblue-500/30 shadow-sm'
                      : 'text-slate-400 hover:bg-navy-800 hover:text-slate-200'
                    }
                  `}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-mediblue-400' : 'text-slate-400'}`} />
                    <span>{item.label}</span>
                  </div>
                  {item.badge !== undefined && item.badge > 0 && (
                    <span className="px-1.5 py-0.2 text-[10px] font-bold rounded-full bg-medidanger-500/20 text-medidanger-500 border border-medidanger-500/30">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* User Card & Role Switcher */}
        <div className="p-3 border-t border-navy-800 bg-navy-900/60">
          <div className="p-2.5 rounded-xl bg-navy-800/80 border border-navy-700/60">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-mediblue-600 text-white font-bold flex items-center justify-center text-xs shrink-0">
                {currentUser.avatar}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-white truncate">{currentUser.name}</p>
                <p className="text-[10px] text-mediblue-400 font-mono truncate">{currentUser.role}</p>
              </div>
            </div>

            {/* Quick Demo Role Selector */}
            <div className="mt-2.5 pt-2 border-t border-navy-700/60 flex items-center justify-between gap-1 text-[10px]">
              <span className="text-slate-400">Switch:</span>
              <button
                onClick={() => setCurrentUser(DEMO_USERS.admin)}
                className={`px-1.5 py-0.5 rounded transition ${currentUser.role === 'Administrator' ? 'bg-mediblue-500 text-white font-bold' : 'text-slate-400 hover:text-white'}`}
              >
                Admin
              </button>
              <button
                onClick={() => setCurrentUser(DEMO_USERS.analyst)}
                className={`px-1.5 py-0.5 rounded transition ${currentUser.role === 'Security Analyst' ? 'bg-mediblue-500 text-white font-bold' : 'text-slate-400 hover:text-white'}`}
              >
                Analyst
              </button>
              <button
                onClick={() => setCurrentUser(DEMO_USERS.doctor)}
                className={`px-1.5 py-0.5 rounded transition ${currentUser.role === 'Doctor Demo' ? 'bg-mediblue-500 text-white font-bold' : 'text-slate-400 hover:text-white'}`}
              >
                Doctor
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Navigation Bar */}
        <header className="h-16 bg-navy-900/90 backdrop-blur border-b border-navy-800 px-4 md:px-8 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="md:hidden p-2 text-slate-400 hover:text-white rounded-lg hover:bg-navy-800"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="hidden sm:flex items-center gap-2 text-xs text-slate-400">
              <span>MediShield</span>
              <ChevronRight className="w-3.5 h-3.5" />
              <span className="text-white font-medium capitalize">
                {navItems.find(i => i.id === currentPage)?.label || currentPage}
              </span>
            </div>
          </div>

          {/* Action Header Items */}
          <div className="flex items-center gap-3">
            {/* Safe Simulation Trigger Button */}
            <button
              onClick={() => setSimulationModalOpen(true)}
              className="px-3 py-1.5 rounded-lg bg-mediblue-500/10 hover:bg-mediblue-500/20 text-mediblue-400 border border-mediblue-500/30 text-xs font-semibold flex items-center gap-1.5 transition"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Safe Simulation Lab
            </button>

            {/* Reset Button */}
            <button
              onClick={resetAllSimulations}
              title="Reset simulated data to default baseline"
              className="p-1.5 rounded-lg bg-navy-800 hover:bg-navy-700 text-slate-300 border border-navy-700 text-xs transition"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>

            {/* Logout to Demo Login page */}
            <button
              onClick={() => setCurrentPage('login')}
              title="Switch / Log out"
              className="p-1.5 rounded-lg bg-navy-800 hover:bg-navy-700 text-slate-400 hover:text-white border border-navy-700 transition"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </header>

        {/* Live Simulation Notice Banner */}
        {simulationNotice && (
          <div className="bg-mediblue-950/80 border-b border-mediblue-800/40 px-4 py-2 flex items-center justify-between text-xs text-mediblue-300">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-mediblue-400 shrink-0" />
              <span>{simulationNotice}</span>
            </div>
            <button
              onClick={() => setSimulationNotice(null)}
              className="text-mediblue-400 hover:text-white ml-2"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Dynamic Page Content Viewport */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8 bg-navy-950">
          <div className="max-w-7xl mx-auto space-y-6">
            {children}
          </div>
        </main>
      </div>

      {/* Safe Simulation Lab Modal */}
      {simulationModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-navy-900 border border-navy-700 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5 animate-in fade-in">
            <div className="flex items-center justify-between border-b border-navy-800 pb-3">
              <div className="flex items-center gap-2 text-white font-bold text-base">
                <Sparkles className="w-5 h-5 text-mediblue-400" />
                IoMT Anomaly & Attack Simulation Lab
              </div>
              <button
                onClick={() => setSimulationModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Trigger synthetic cybersecurity anomalies in a safe, controlled memory state. These tests demonstrate
              deterministic rule detection without sending packets over real external networks.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
              <button
                onClick={() => { triggerSimulation('auth_spike'); setSimulationModalOpen(false); }}
                className="p-3 text-left bg-navy-800/70 hover:bg-navy-800 border border-navy-700 rounded-xl hover:border-mediblue-500/50 transition group"
              >
                <div className="font-semibold text-slate-200 group-hover:text-mediblue-400">Brute Force Auth Spike</div>
                <div className="text-[11px] text-slate-400 mt-1">Triggers RULE-AUTH-002 on Ventilator V-2 (SSH port 22).</div>
              </button>

              <button
                onClick={() => { triggerSimulation('traffic_spike'); setSimulationModalOpen(false); }}
                className="p-3 text-left bg-navy-800/70 hover:bg-navy-800 border border-navy-700 rounded-xl hover:border-mediblue-500/50 transition group"
              >
                <div className="font-semibold text-slate-200 group-hover:text-mediblue-400">Traffic Volume Surge</div>
                <div className="text-[11px] text-slate-400 mt-1">Triggers RULE-NET-003 on Infusion Pump B-4 (Bandwidth spike).</div>
              </button>

              <button
                onClick={() => { triggerSimulation('device_offline'); setSimulationModalOpen(false); }}
                className="p-3 text-left bg-navy-800/70 hover:bg-navy-800 border border-navy-700 rounded-xl hover:border-mediblue-500/50 transition group"
              >
                <div className="font-semibold text-slate-200 group-hover:text-mediblue-400">Device Offline Failure</div>
                <div className="text-[11px] text-slate-400 mt-1">Triggers RULE-STAT-004 (Missed telemetry heartbeats).</div>
              </button>

              <button
                onClick={() => { triggerSimulation('unknown_device'); setSimulationModalOpen(false); }}
                className="p-3 text-left bg-navy-800/70 hover:bg-navy-800 border border-navy-700 rounded-xl hover:border-mediblue-500/50 transition group"
              >
                <div className="font-semibold text-slate-200 group-hover:text-mediblue-400">Rogue Device Injection</div>
                <div className="text-[11px] text-slate-400 mt-1">Triggers RULE-DEV-001 (Unrecognized MAC on ICU VLAN).</div>
              </button>

              <button
                onClick={() => { triggerSimulation('integrity_mismatch'); setSimulationModalOpen(false); }}
                className="p-3 text-left bg-navy-800/70 hover:bg-navy-800 border border-navy-700 rounded-xl hover:border-mediblue-500/50 transition group"
              >
                <div className="font-semibold text-slate-200 group-hover:text-mediblue-400">Simulate Data Tampering</div>
                <div className="text-[11px] text-slate-400 mt-1">Modifies 1 byte in telemetry record to fail SHA-256 validation.</div>
              </button>

              <button
                onClick={() => { triggerSimulation('normal'); setSimulationModalOpen(false); }}
                className="p-3 text-left bg-navy-800/70 hover:bg-navy-800 border border-navy-700 rounded-xl hover:border-emerald-500/50 transition group"
              >
                <div className="font-semibold text-slate-200 group-hover:text-emerald-400">Normal Baseline Traffic</div>
                <div className="text-[11px] text-slate-400 mt-1">Issues valid vital signals with 0 detection triggers.</div>
              </button>
            </div>

            <div className="pt-2 border-t border-navy-800 flex justify-end">
              <button
                onClick={() => setSimulationModalOpen(false)}
                className="px-4 py-2 bg-navy-800 hover:bg-navy-700 text-slate-300 rounded-xl text-xs font-semibold"
              >
                Close Lab
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
