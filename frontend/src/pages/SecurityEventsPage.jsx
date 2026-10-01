import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  AlertTriangle,
  Search,
  Filter,
  ShieldAlert,
  ChevronRight,
  Eye,
  FilePlus2,
  CheckCircle2,
  Sparkles,
  Zap,
  Activity,
  WifiOff,
  Code2,
  X
} from 'lucide-react';

export default function SecurityEventsPage() {
  const {
    securityEvents,
    setSelectedDeviceId,
    setCurrentPage,
    createIncidentFromEvent,
    triggerSimulation,
    currentUser
  } = useApp();

  const [search, setSearch] = useState('');
  const [severityFilter, setSeverityFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedEvent, setSelectedEvent] = useState(null);

  const filteredEvents = securityEvents.filter(evt => {
    const matchSearch =
      evt.id.toLowerCase().includes(search.toLowerCase()) ||
      evt.ruleName.toLowerCase().includes(search.toLowerCase()) ||
      evt.deviceName.toLowerCase().includes(search.toLowerCase()) ||
      evt.deviceId.toLowerCase().includes(search.toLowerCase());

    const matchSev = severityFilter === 'ALL' || evt.severity.toUpperCase() === severityFilter;
    const matchStat = statusFilter === 'ALL' || evt.status.toUpperCase() === statusFilter;

    return matchSearch && matchSev && matchStat;
  });

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
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-400" />
            IoMT Security Detection Events
          </h1>
          <p className="text-xs text-slate-400">
            Rule-based detections and heuristic anomaly flags triggered by synthetic clinical telemetry.
          </p>
        </div>

        {/* Quick Simulation Trigger Bar */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => triggerSimulation('auth_spike')}
            className="px-2.5 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition"
          >
            <Zap className="w-3.5 h-3.5" /> + Brute Force Alert
          </button>
          <button
            onClick={() => triggerSimulation('traffic_spike')}
            className="px-2.5 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition"
          >
            <Activity className="w-3.5 h-3.5" /> + Traffic Surge Alert
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-navy-900 border border-navy-800 p-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search events by rule, device or ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-navy-950 border border-navy-700 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-mediblue-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="bg-navy-950 border border-navy-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-mediblue-500"
          >
            <option value="ALL">All Severities</option>
            <option value="CRITICAL">Critical</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-navy-950 border border-navy-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-mediblue-500"
          >
            <option value="ALL">All Statuses</option>
            <option value="OPEN">Open</option>
            <option value="INVESTIGATING">Investigating</option>
            <option value="RESOLVED">Resolved</option>
            <option value="CLOSED">Closed</option>
          </select>
        </div>
      </div>

      {/* Events Table */}
      <div className="bg-navy-900 border border-navy-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-navy-950/60 text-slate-400 uppercase text-[10px] tracking-wider border-b border-navy-800">
              <tr>
                <th className="py-3 px-4">Event ID</th>
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Detection Rule</th>
                <th className="py-3 px-4">Target Device</th>
                <th className="py-3 px-4">Severity</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-navy-800 text-slate-300">
              {filteredEvents.map((evt) => (
                <tr key={evt.id} className="hover:bg-navy-800/40 transition">
                  <td className="py-3.5 px-4 font-mono font-medium text-mediblue-400">
                    {evt.id}
                  </td>
                  <td className="py-3.5 px-4 text-slate-400">{evt.timestamp}</td>
                  <td className="py-3.5 px-4">
                    <div className="font-semibold text-white">{evt.ruleName}</div>
                    <div className="font-mono text-[10px] text-slate-400">{evt.ruleId}</div>
                  </td>
                  <td className="py-3.5 px-4">
                    <button
                      onClick={() => { setSelectedDeviceId(evt.deviceId); setCurrentPage('device-detail'); }}
                      className="font-medium text-white hover:underline text-left"
                    >
                      {evt.deviceName}
                    </button>
                    <div className="font-mono text-[10px] text-slate-400">{evt.deviceId}</div>
                  </td>
                  <td className="py-3.5 px-4">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${getSeverityBadge(evt.severity)}`}>
                      {evt.severity.toUpperCase()}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 capitalize font-mono text-[11px] text-slate-300">
                    {evt.status}
                  </td>
                  <td className="py-3.5 px-4 text-right space-x-1.5">
                    <button
                      onClick={() => setSelectedEvent(evt)}
                      className="px-2.5 py-1 bg-navy-800 hover:bg-navy-700 text-slate-200 border border-navy-700 rounded-lg text-xs transition inline-flex items-center gap-1"
                    >
                      <Eye className="w-3.5 h-3.5 text-mediblue-400" /> Inspect
                    </button>

                    {currentUser.role !== 'Doctor Demo' && (
                      <button
                        onClick={() => createIncidentFromEvent(evt)}
                        title="Promote event to formal incident ticket"
                        className="px-2.5 py-1 bg-mediblue-600/30 hover:bg-mediblue-600 text-mediblue-300 hover:text-white border border-mediblue-500/40 rounded-lg text-xs transition inline-flex items-center gap-1 font-semibold"
                      >
                        <FilePlus2 className="w-3.5 h-3.5" /> Escalate
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Event Detail Inspection Modal */}
      {selectedEvent && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-navy-900 border border-navy-700 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-navy-800 pb-3">
              <div>
                <span className="font-mono text-xs text-mediblue-400 font-bold">{selectedEvent.id}</span>
                <h2 className="text-base font-bold text-white">{selectedEvent.ruleName}</h2>
              </div>
              <button onClick={() => setSelectedEvent(null)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2 p-3 bg-navy-950 rounded-xl border border-navy-800">
                <div>
                  <span className="text-slate-400">Target Device:</span>
                  <div className="font-semibold text-white">{selectedEvent.deviceName}</div>
                  <div className="font-mono text-[10px] text-slate-400">{selectedEvent.deviceId}</div>
                </div>
                <div>
                  <span className="text-slate-400">Severity Assessment:</span>
                  <div>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${getSeverityBadge(selectedEvent.severity)}`}>
                      {selectedEvent.severity.toUpperCase()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Evidence JSON */}
              <div className="space-y-1">
                <span className="text-slate-300 font-semibold flex items-center gap-1.5">
                  <Code2 className="w-3.5 h-3.5 text-mediblue-400" />
                  Forensic Event Evidence (JSON Payload):
                </span>
                <pre className="p-3 bg-navy-950 border border-navy-800 rounded-xl font-mono text-[11px] text-emerald-400 overflow-x-auto">
                  {JSON.stringify(selectedEvent.evidence, null, 2)}
                </pre>
              </div>

              {/* Suggested Remediation */}
              <div className="p-3 bg-mediblue-950/40 border border-mediblue-800/40 rounded-xl space-y-1">
                <span className="font-semibold text-mediblue-400">Recommended Analyst Action:</span>
                <p className="text-slate-300 leading-relaxed">{selectedEvent.suggestedAction}</p>
              </div>
            </div>

            <div className="pt-3 border-t border-navy-800 flex justify-end gap-2">
              <button
                onClick={() => setSelectedEvent(null)}
                className="px-3 py-1.5 bg-navy-800 text-slate-300 rounded-xl text-xs"
              >
                Dismiss
              </button>
              {currentUser.role !== 'Doctor Demo' && (
                <button
                  onClick={() => {
                    const evt = selectedEvent;
                    setSelectedEvent(null);
                    createIncidentFromEvent(evt);
                  }}
                  className="px-4 py-1.5 bg-mediblue-600 hover:bg-mediblue-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5"
                >
                  <FilePlus2 className="w-3.5 h-3.5" /> Escalate to Incident
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
