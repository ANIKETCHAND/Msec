import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';
import StatusBadge from '../components/common/StatusBadge';
import {
  AlertTriangle,
  Search,
  Filter,
  ChevronRight,
  Eye,
  FilePlus2,
  CheckCircle2,
  X,
  Clock,
  Server,
  RefreshCw
} from 'lucide-react';

export default function SecurityEventsPage() {
  const {
    securityEvents: contextEvents,
    setSelectedDeviceId,
    setCurrentPage,
    createIncidentFromEvent,
    currentUser
  } = useApp();

  const [events, setEvents] = useState(contextEvents);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [severityFilter, setSeverityFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedEvent, setSelectedEvent] = useState(null);

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const data = await api.getSecurityEvents();
      if (Array.isArray(data) && data.length > 0) {
        setEvents(data.map(e => ({
          id: e.id,
          timestamp: e.timestamp ? new Date(e.timestamp).toLocaleTimeString() : 'Recent',
          eventType: e.event_type,
          ruleId: e.rule_id,
          ruleName: e.rule_name || e.title || 'Security Alert',
          deviceId: e.device_id || 'DEV-UNKNOWN',
          deviceName: e.device_id || 'Medical Device',
          severity: (e.severity || 'medium').toLowerCase(),
          status: (e.status || 'open').toLowerCase(),
          evidence: e.evidence || {},
          suggestedAction: e.suggested_action || 'Investigate telemetry stream.'
        })));
      }
    } catch (err) {
      console.warn('[SecurityEvents] Failed to fetch live events:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  const activeEvents = events.length > 0 ? events : contextEvents;

  const filteredEvents = activeEvents.filter(evt => {
    const matchSearch =
      (evt.id || '').toLowerCase().includes(search.toLowerCase()) ||
      (evt.ruleName || '').toLowerCase().includes(search.toLowerCase()) ||
      (evt.deviceId || '').toLowerCase().includes(search.toLowerCase());

    const evtSev = (evt.severity || '').toUpperCase();
    const matchSev = severityFilter === 'ALL' || evtSev === severityFilter;
    const evtStat = (evt.status || '').toUpperCase();
    const matchStat = statusFilter === 'ALL' || evtStat === statusFilter;

    return matchSearch && matchSev && matchStat;
  });

  return (
    <div className="space-y-6">
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E5E7EB]">
        <div>
          <h1 className="text-xl font-semibold text-[#171717] tracking-tight flex items-center gap-2">
            <span>Security Events & IDS Telemetry</span>
            <span className="text-xs font-mono text-[#6B7280] font-normal">
              ({activeEvents.length} events logged)
            </span>
          </h1>
          <p className="text-xs text-[#6B7280] mt-0.5">
            Passive Suricata EVE, Zeek connection logs, and heuristic rule triggers.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchEvents}
            disabled={loading}
            className="p-1.5 rounded border border-[#E5E7EB] hover:bg-[#F9FAFB] text-[#6B7280] hover:text-[#171717] transition-swiss"
            title="Refresh security events"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#1677FF]' : ''}`} />
          </button>
          <div className="flex items-center gap-2 text-xs font-mono text-[#6B7280]">
            <span className="w-2 h-2 rounded-full bg-[#10B981]" />
            <span>Real-Time Stream Active</span>
          </div>
        </div>
      </div>

      {/* 2. Controls Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
        <div className="sm:col-span-6 relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by event name, alert ID, device ID..."
            className="w-full bg-white text-xs text-[#171717] placeholder-[#9CA3AF] pl-8 pr-3 py-2 rounded border border-[#E5E7EB] focus:border-[#1677FF] focus:outline-none transition-swiss font-mono"
          />
        </div>

        <div className="sm:col-span-3">
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="w-full bg-white text-xs text-[#171717] px-2.5 py-2 rounded border border-[#E5E7EB] focus:border-[#1677FF] focus:outline-none transition-swiss font-mono"
          >
            <option value="ALL">Severity: All</option>
            <option value="CRITICAL">Severity: Critical</option>
            <option value="HIGH">Severity: High</option>
            <option value="MEDIUM">Severity: Medium</option>
            <option value="LOW">Severity: Low</option>
          </select>
        </div>

        <div className="sm:col-span-3">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full bg-white text-xs text-[#171717] px-2.5 py-2 rounded border border-[#E5E7EB] focus:border-[#1677FF] focus:outline-none transition-swiss font-mono"
          >
            <option value="ALL">Status: All</option>
            <option value="OPEN">Status: Open</option>
            <option value="INVESTIGATING">Status: Investigating</option>
            <option value="RESOLVED">Status: Resolved</option>
          </select>
        </div>
      </div>

      {/* 3. Clean Swiss Table */}
      <div className="bg-white border border-[#E5E7EB] rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-[#F9FAFB] border-b border-[#E5E7EB] text-[#6B7280] font-medium uppercase text-[11px] tracking-wider select-none">
                <th className="py-3 px-4">Severity</th>
                <th className="py-3 px-4">Event Trigger</th>
                <th className="py-3 px-4">Target Endpoint</th>
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F3F4F6]">
              {filteredEvents.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-8 text-center text-xs text-[#6B7280]">
                    No security events found matching current criteria.
                  </td>
                </tr>
              ) : (
                filteredEvents.map((evt) => (
                  <tr
                    key={evt.id}
                    onClick={() => setSelectedEvent(evt)}
                    className="hover:bg-[#F9FAFB] cursor-pointer transition-swiss group"
                  >
                    <td className="py-3 px-4">
                      <StatusBadge status={evt.severity} size="xs" />
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-semibold text-[#171717] group-hover:text-[#1677FF] transition-swiss block">
                        {evt.ruleName}
                      </span>
                      <span className="text-[11px] text-[#6B7280] font-mono block mt-0.5">
                        {evt.id}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono">
                      <span
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedDeviceId(evt.deviceId);
                          setCurrentPage('device-detail');
                        }}
                        className="text-[#1677FF] hover:underline font-medium"
                      >
                        {evt.deviceId}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-[#6B7280] text-[11px]">
                      {evt.timestamp}
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge status={evt.status} size="xs" />
                    </td>
                    <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setSelectedEvent(evt)}
                          className="px-2 py-1 rounded text-[11px] font-medium text-[#6B7280] hover:text-[#171717] hover:bg-[#F3F4F6] transition-swiss"
                        >
                          Evidence
                        </button>
                        {currentUser.role !== 'Doctor Demo' && evt.status !== 'resolved' && (
                          <button
                            onClick={() => createIncidentFromEvent(evt)}
                            className="px-2 py-1 rounded text-[11px] font-medium text-[#1677FF] bg-[#E6F4FF] hover:bg-blue-100 transition-swiss"
                          >
                            Escalate Ticket
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Event Evidence Detail Modal */}
      {selectedEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white border border-[#E5E7EB] rounded-lg max-w-lg w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#E5E7EB]">
              <div>
                <h3 className="font-semibold text-sm text-[#171717]">{selectedEvent.ruleName}</h3>
                <span className="text-[11px] font-mono text-[#6B7280]">{selectedEvent.id}</span>
              </div>
              <button
                onClick={() => setSelectedEvent(null)}
                className="text-[#9CA3AF] hover:text-[#171717]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3 p-3 bg-[#F9FAFB] rounded border border-[#E5E7EB]">
                <div>
                  <span className="text-[#6B7280] block text-[11px]">Target Device</span>
                  <span className="font-semibold text-[#171717] font-mono">{selectedEvent.deviceId}</span>
                </div>
                <div>
                  <span className="text-[#6B7280] block text-[11px]">Severity Level</span>
                  <StatusBadge status={selectedEvent.severity} size="xs" />
                </div>
              </div>

              <div>
                <span className="font-medium text-[#171717] block mb-1">Recommended Response Action</span>
                <p className="p-2.5 bg-blue-50 border border-blue-100 rounded text-blue-900 leading-relaxed">
                  {selectedEvent.suggestedAction}
                </p>
              </div>

              <div>
                <span className="font-medium text-[#171717] block mb-1">Packet Payload Evidence</span>
                <pre className="p-3 bg-[#171717] text-[#F3F4F6] rounded font-mono text-[11px] overflow-x-auto">
                  {JSON.stringify(selectedEvent.evidence || {}, null, 2)}
                </pre>
              </div>
            </div>

            <div className="pt-3 border-t border-[#E5E7EB] flex items-center justify-between">
              <button
                onClick={() => {
                  setSelectedDeviceId(selectedEvent.deviceId);
                  setSelectedEvent(null);
                  setCurrentPage('device-detail');
                }}
                className="text-xs text-[#1677FF] hover:underline font-medium"
              >
                Inspect Device &rarr;
              </button>
              <button
                onClick={() => setSelectedEvent(null)}
                className="px-3 py-1.5 rounded border border-[#E5E7EB] hover:bg-[#F9FAFB] text-xs font-medium text-[#171717]"
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
