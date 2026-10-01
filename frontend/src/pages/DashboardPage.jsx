import React from 'react';
import { useApp } from '../context/AppContext';
import {
  Server,
  Activity,
  AlertTriangle,
  ShieldCheck,
  ShieldAlert,
  Flame,
  Zap,
  ArrowUpRight,
  Radio,
  WifiOff,
  Clock,
  Sparkles,
  Network
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';

export default function DashboardPage() {
  const {
    devices,
    securityEvents,
    incidents,
    eventTrends,
    setCurrentPage,
    setSelectedDeviceId,
    triggerSimulation
  } = useApp();

  // Metrics calculations
  const totalDevices = devices.length;
  const onlineDevices = devices.filter(d => d.status === 'online').length;
  const offlineDevices = devices.filter(d => d.status === 'offline').length;
  const suspiciousDevices = devices.filter(d => d.status === 'suspicious' || d.status === 'isolated').length;
  const activeEvents = securityEvents.filter(e => e.status === 'open' || e.status === 'investigating').length;
  const criticalIncidents = incidents.filter(i => i.severity === 'critical' && i.status !== 'closed').length;

  // Chart data: Device Status Pie
  const deviceStatusData = [
    { name: 'Online', value: onlineDevices, color: '#10b981' },
    { name: 'Suspicious / Isolated', value: suspiciousDevices, color: '#f59e0b' },
    { name: 'Offline', value: offlineDevices, color: '#ef4444' }
  ];

  // Chart data: Severity distribution
  const severityData = [
    { name: 'Low', count: securityEvents.filter(e => e.severity === 'low').length, fill: '#38bdf8' },
    { name: 'Medium', count: securityEvents.filter(e => e.severity === 'medium').length, fill: '#f59e0b' },
    { name: 'High', count: securityEvents.filter(e => e.severity === 'high').length, fill: '#f97316' },
    { name: 'Critical', count: securityEvents.filter(e => e.severity === 'critical').length, fill: '#ef4444' }
  ];

  const getSeverityBadge = (severity) => {
    switch (severity.toLowerCase()) {
      case 'critical':
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'high':
        return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
      case 'medium':
        return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
      default:
        return 'bg-sky-500/20 text-sky-400 border-sky-500/30';
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Welcome */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-navy-900 border border-navy-800 p-5 rounded-2xl">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            IoMT Security Operations Center
            <span className="flex h-2.5 w-2.5 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time telemetry surveillance, rule-based heuristics, and ML attack classification.
          </p>
        </div>

        {/* Quick Simulation Triggers */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mr-1">Quick Scenarios:</span>
          <button
            onClick={() => triggerSimulation('auth_spike')}
            className="px-2.5 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 rounded-lg text-xs font-medium transition flex items-center gap-1.5"
          >
            <Zap className="w-3 h-3" /> Brute Force
          </button>
          <button
            onClick={() => triggerSimulation('traffic_spike')}
            className="px-2.5 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-lg text-xs font-medium transition flex items-center gap-1.5"
          >
            <Activity className="w-3 h-3" /> Traffic Spike
          </button>
          <button
            onClick={() => triggerSimulation('device_offline')}
            className="px-2.5 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-lg text-xs font-medium transition flex items-center gap-1.5"
          >
            <WifiOff className="w-3 h-3" /> Drop Offline
          </button>
        </div>
      </div>

      {/* Primary KPI Metrics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Devices */}
        <div className="bg-navy-900 border border-navy-800 p-5 rounded-2xl space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Monitored Devices</span>
            <Server className="w-4 h-4 text-mediblue-400" />
          </div>
          <div className="text-2xl font-bold text-white tracking-tight">{totalDevices}</div>
          <div className="text-[11px] text-slate-400 flex items-center gap-2 pt-1 border-t border-navy-800">
            <span className="text-emerald-400 font-semibold">{onlineDevices} Online</span>
            <span>•</span>
            <span className="text-red-400 font-semibold">{offlineDevices} Offline</span>
          </div>
        </div>

        {/* Metric 2: Active Events */}
        <div className="bg-navy-900 border border-navy-800 p-5 rounded-2xl space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Active Security Alerts</span>
            <AlertTriangle className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-white tracking-tight">{activeEvents}</div>
          <div className="text-[11px] text-amber-400 flex items-center gap-1.5 pt-1 border-t border-navy-800">
            <Flame className="w-3 h-3" />
            <span>Requires Analyst Triage</span>
          </div>
        </div>

        {/* Metric 3: Critical Incidents */}
        <div className="bg-navy-900 border border-navy-800 p-5 rounded-2xl space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Critical Incidents</span>
            <ShieldAlert className="w-4 h-4 text-red-400" />
          </div>
          <div className="text-2xl font-bold text-white tracking-tight">{criticalIncidents}</div>
          <div className="text-[11px] text-red-400 flex items-center gap-1.5 pt-1 border-t border-navy-800">
            <span>High priority investigations</span>
          </div>
        </div>

        {/* Metric 4: Integrity Status */}
        <div className="bg-navy-900 border border-navy-800 p-5 rounded-2xl space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Data Integrity State</span>
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-emerald-400 tracking-tight">Active SHA-256</div>
          <div className="text-[11px] text-slate-400 pt-1 border-t border-navy-800 flex items-center justify-between">
            <span>AES-GCM Encryption</span>
            <span className="text-emerald-400 font-semibold">Enabled</span>
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Trend Area Chart (Span 2) */}
        <div className="lg:col-span-2 bg-navy-900 border border-navy-800 p-5 rounded-2xl space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-white">24-Hour IoMT Attack & Event Trends</h2>
              <p className="text-[11px] text-slate-400">Classified traffic volume vs observed intrusion attempts.</p>
            </div>
            <span className="text-[10px] font-mono bg-navy-800 text-slate-300 px-2 py-1 rounded">Hourly Aggregation</span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={eventTrends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorNormal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorBrute" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="time" stroke="#64748b" tick={{ fontSize: 11 }} />
                <YAxis stroke="#64748b" tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '0.75rem', fontSize: '11px' }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                <Area type="monotone" dataKey="Normal" stroke="#0ea5e9" fillOpacity={1} fill="url(#colorNormal)" name="Normal Flows" />
                <Area type="monotone" dataKey="BruteForce" stroke="#ef4444" fillOpacity={1} fill="url(#colorBrute)" name="Auth Attacks" />
                <Area type="monotone" dataKey="DoS" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.2} name="DoS / Flood" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Severity & Status Donut / Bar (Span 1) */}
        <div className="bg-navy-900 border border-navy-800 p-5 rounded-2xl space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-white">Device Status Distribution</h2>
              <p className="text-[11px] text-slate-400">Inventory connectivity state.</p>
            </div>
          </div>

          <div className="h-44 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={deviceStatusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={70}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {deviceStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '0.75rem', fontSize: '11px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center text-[10px] pt-2 border-t border-navy-800">
            <div>
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 mr-1"></span>
              <span className="text-slate-300 font-semibold">{onlineDevices}</span>
              <p className="text-slate-400">Online</p>
            </div>
            <div>
              <span className="inline-block w-2 h-2 rounded-full bg-amber-500 mr-1"></span>
              <span className="text-slate-300 font-semibold">{suspiciousDevices}</span>
              <p className="text-slate-400">Alerted</p>
            </div>
            <div>
              <span className="inline-block w-2 h-2 rounded-full bg-red-500 mr-1"></span>
              <span className="text-slate-300 font-semibold">{offlineDevices}</span>
              <p className="text-slate-400">Offline</p>
            </div>
          </div>
        </div>
      </div>

      {/* Simulated IoMT Network Topology Map */}
      <div className="bg-navy-900 border border-navy-800 p-5 rounded-2xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Network className="w-5 h-5 text-mediblue-400" />
            <div>
              <h2 className="text-sm font-bold text-white">Simulated IoMT Network Segments & Topology</h2>
              <p className="text-[11px] text-slate-400">VLAN segmentation isolating critical medical hardware.</p>
            </div>
          </div>
          <span className="text-xs text-mediblue-400 font-mono">Core GW: 192.168.10.1</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          {/* Segment 1: ICU VLAN */}
          <div className="p-3.5 bg-navy-800/60 border border-navy-700 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-200">ICU_VLAN_10</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-mediblue-500/20 text-mediblue-400 font-mono">192.168.10.0/24</span>
            </div>
            <p className="text-[11px] text-slate-400">Bedside ECG, Smart Pumps, Ventilators</p>
            <div className="flex items-center justify-between text-[11px] pt-1 border-t border-navy-700/60">
              <span className="text-slate-400">3 Devices</span>
              <span className="text-amber-400 font-medium">1 Alert Active</span>
            </div>
          </div>

          {/* Segment 2: Ward VLAN */}
          <div className="p-3.5 bg-navy-800/60 border border-navy-700 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-200">WARD_VLAN_20</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-mediblue-500/20 text-mediblue-400 font-mono">192.168.20.0/24</span>
            </div>
            <p className="text-[11px] text-slate-400">Glucose Monitors, General Bed Monitors</p>
            <div className="flex items-center justify-between text-[11px] pt-1 border-t border-navy-700/60">
              <span className="text-slate-400">2 Devices</span>
              <span className="text-emerald-400 font-medium">Normal State</span>
            </div>
          </div>

          {/* Segment 3: ER VLAN */}
          <div className="p-3.5 bg-navy-800/60 border border-navy-700 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-200">ER_VLAN_30</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 font-mono">192.168.30.0/24</span>
            </div>
            <p className="text-[11px] text-slate-400">Emergency Defibrillators, Crash Carts</p>
            <div className="flex items-center justify-between text-[11px] pt-1 border-t border-navy-700/60">
              <span className="text-slate-400">1 Device</span>
              <span className="text-red-400 font-medium">Device Offline</span>
            </div>
          </div>

          {/* Segment 4: Ambulatory VLAN */}
          <div className="p-3.5 bg-navy-800/60 border border-navy-700 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-200">AMBULATORY_VLAN_40</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-mediblue-500/20 text-mediblue-400 font-mono">192.168.40.0/24</span>
            </div>
            <p className="text-[11px] text-slate-400">Wearable Health Sensors, Pulse Oximeters</p>
            <div className="flex items-center justify-between text-[11px] pt-1 border-t border-navy-700/60">
              <span className="text-slate-400">1 Device</span>
              <span className="text-emerald-400 font-medium">Normal State</span>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Security Alerts Table */}
      <div className="bg-navy-900 border border-navy-800 rounded-2xl overflow-hidden">
        <div className="p-5 border-b border-navy-800 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-white">Recent Security Detections</h2>
            <p className="text-[11px] text-slate-400">Rule-based triggers and ML flow classifications.</p>
          </div>
          <button
            onClick={() => setCurrentPage('security-events')}
            className="text-xs text-mediblue-400 hover:text-mediblue-300 font-semibold flex items-center gap-1"
          >
            View All Events <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-navy-950/60 text-slate-400 uppercase text-[10px] tracking-wider border-b border-navy-800">
              <tr>
                <th className="py-3 px-4">Event ID</th>
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Affected Device</th>
                <th className="py-3 px-4">Detection Rule</th>
                <th className="py-3 px-4">Severity</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-navy-800 text-slate-300">
              {securityEvents.slice(0, 4).map((evt) => (
                <tr key={evt.id} className="hover:bg-navy-800/40 transition">
                  <td className="py-3 px-4 font-mono text-mediblue-400">{evt.id}</td>
                  <td className="py-3 px-4 text-slate-400">{evt.timestamp}</td>
                  <td className="py-3 px-4 font-medium text-white">
                    <button
                      onClick={() => { setSelectedDeviceId(evt.deviceId); setCurrentPage('device-detail'); }}
                      className="hover:underline text-left text-white"
                    >
                      {evt.deviceName}
                    </button>
                  </td>
                  <td className="py-3 px-4 text-slate-300">{evt.ruleName}</td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${getSeverityBadge(evt.severity)}`}>
                      {evt.severity.toUpperCase()}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span className="capitalize text-slate-400 font-mono text-[11px]">{evt.status}</span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={() => setCurrentPage('security-events')}
                      className="text-xs text-mediblue-400 hover:text-white px-2 py-1 rounded bg-navy-800 hover:bg-navy-700 transition"
                    >
                      Inspect
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
