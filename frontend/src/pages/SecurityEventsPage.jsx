import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';
import StatusBadge from '../components/common/StatusBadge';
import {
  AlertTriangle,
  Search,
  CheckCircle2,
  Clock,
  Server,
  RefreshCw,
  Shield,
  ArrowRight,
  ExternalLink,
  Copy,
  Check,
  Activity,
  FileText,
  Filter
} from 'lucide-react';

export default function SecurityEventsPage() {
  const {
    securityEvents: contextEvents,
    setSelectedDeviceId,
    setCurrentPage,
    currentUser,
    logAudit
  } = useApp();

  const [events, setEvents] = useState(contextEvents);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [severityFilter, setSeverityFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedEventId, setSelectedEventId] = useState(null);
  const [copiedEvidence, setCopiedEvidence] = useState(false);

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const data = await api.getSecurityEvents();
      if (Array.isArray(data) && data.length > 0) {
        const formatted = data.map(e => ({
          id: e.id,
          timestamp: e.timestamp ? new Date(e.timestamp).toLocaleString() : 'Recent',
          rawTimestamp: e.timestamp,
          eventType: e.event_type || 'ANOMALY_DETECTION',
          ruleId: e.rule_id || 'RULE-GENERIC',
          ruleName: e.rule_name || e.title || 'Security Anomaly Detected',
          deviceId: e.device_id || 'DEV-UNKNOWN',
          severity: (e.severity || 'medium').toLowerCase(),
          status: (e.status || 'open').toLowerCase(),
          evidence: e.evidence || {},
          suggestedAction: e.suggested_action || 'Inspect network telemetry and verify IoMT endpoint segment isolation.'
        }));
        setEvents(formatted);
        if (!selectedEventId && formatted.length > 0) {
          setSelectedEventId(formatted[0].id);
        }
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

  // Set default selected event if none is selected
  useEffect(() => {
    if (!selectedEventId && activeEvents.length > 0) {
      setSelectedEventId(activeEvents[0].id);
    }
  }, [activeEvents, selectedEventId]);

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

  const selectedEvent = activeEvents.find(e => e.id === selectedEventId) || activeEvents[0];

  const handleUpdateStatus = async (eventId, newStatus) => {
    setActionLoading(true);
    try {
      await api.updateSecurityEvent(eventId, { status: newStatus });
      setEvents(prev => prev.map(e => e.id === eventId ? { ...e, status: newStatus } : e));
      if (logAudit) {
        logAudit('SECURITY_EVENT_TRIAGE', 'SecurityEvent', eventId, `Status transitioned to ${newStatus}.`);
      }
    } catch (err) {
      console.error('[SecurityEvents] Failed to update event status:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleCopyEvidence = () => {
    if (!selectedEvent?.evidence) return;
    navigator.clipboard.writeText(JSON.stringify(selectedEvent.evidence, null, 2));
    setCopiedEvidence(true);
    setTimeout(() => setCopiedEvidence(false), 2000);
  };

  return (
    <div className="h-full flex flex-col space-y-4 animate-fadeIn">
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#E5E7EB] shrink-0">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-semibold text-[#171717] tracking-tight">
              Security Events & Forensic Evidence
            </h1>
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              IDS Stream Active
            </span>
          </div>
          <p className="text-xs text-[#6B7280] mt-0.5">
            Real-time telemetry triage, passive IDS signatures, and deep packet evidence inspection.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchEvents}
            disabled={loading}
            className="p-1.5 rounded border border-[#E5E7EB] hover:bg-[#F9FAFB] text-[#6B7280] hover:text-[#171717] transition-swiss cursor-pointer"
            title="Refresh security events"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#1677FF]' : ''}`} />
          </button>
          <span className="text-xs font-mono text-[#6B7280]">
            {filteredEvents.length} / {activeEvents.length} Events
          </span>
        </div>
      </div>

      {/* 2. Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 flex-1 min-h-0 overflow-hidden">
        
        {/* LEFT COLUMN: Security Event Queue (5 cols) */}
        <div className="lg:col-span-5 flex flex-col min-h-0 bg-white border border-[#E5E7EB] rounded-lg overflow-hidden shadow-xs">
          
          {/* Queue Filters & Search */}
          <div className="p-3 border-b border-[#E5E7EB] space-y-2 bg-[#F9FAFB]">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Filter by title, ID, device..."
                className="w-full bg-white text-xs text-[#171717] placeholder-[#9CA3AF] pl-8 pr-3 py-1.5 rounded border border-[#E5E7EB] focus:border-[#1677FF] focus:outline-none transition-swiss font-mono"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <select
                value={severityFilter}
                onChange={(e) => setSeverityFilter(e.target.value)}
                className="w-full bg-white text-[11px] text-[#171717] px-2 py-1 rounded border border-[#E5E7EB] focus:border-[#1677FF] focus:outline-none transition-swiss font-mono"
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
                className="w-full bg-white text-[11px] text-[#171717] px-2 py-1 rounded border border-[#E5E7EB] focus:border-[#1677FF] focus:outline-none transition-swiss font-mono"
              >
                <option value="ALL">All Statuses</option>
                <option value="OPEN">Open</option>
                <option value="INVESTIGATING">Investigating</option>
                <option value="RESOLVED">Resolved</option>
              </select>
            </div>
          </div>

          {/* Scrollable Event List */}
          <div className="flex-1 overflow-y-auto divide-y divide-[#F3F4F6] p-1">
            {filteredEvents.length === 0 ? (
              <div className="p-8 text-center text-xs text-[#6B7280]">
                <AlertTriangle className="w-6 h-6 mx-auto mb-2 text-[#9CA3AF]" />
                <p className="font-medium text-[#374151]">No matching events</p>
                <p className="text-[11px] text-[#9CA3AF] mt-0.5">Try adjusting search or severity filters.</p>
              </div>
            ) : (
              filteredEvents.map((evt) => {
                const isSelected = selectedEvent?.id === evt.id;
                return (
                  <div
                    key={evt.id}
                    onClick={() => setSelectedEventId(evt.id)}
                    className={`
                      p-3 rounded-md cursor-pointer transition-swiss text-xs
                      ${isSelected
                        ? 'bg-[#E6F4FF]/50 border-l-4 border-l-[#1677FF] border border-[#B5D8FE]'
                        : 'hover:bg-[#F9FAFB] border border-transparent'
                      }
                    `}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-[#171717] truncate leading-snug">
                        {evt.ruleName}
                      </span>
                      <StatusBadge status={evt.severity} size="xs" />
                    </div>

                    <div className="mt-1.5 flex items-center justify-between text-[11px] text-[#6B7280] font-mono">
                      <span>{evt.id}</span>
                      <span className="capitalize px-1.5 py-0.2 rounded bg-neutral-100 text-neutral-700">
                        {evt.status}
                      </span>
                    </div>

                    <div className="mt-1 flex items-center justify-between text-[11px] text-[#6B7280]">
                      <span className="font-mono text-[#1677FF]">
                        {evt.deviceId}
                      </span>
                      <span className="text-[10px] text-[#9CA3AF] flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {evt.timestamp}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Event Description & Evidence (7 cols) */}
        <div className="lg:col-span-7 flex flex-col min-h-0 bg-white border border-[#E5E7EB] rounded-lg overflow-y-auto shadow-xs p-5 space-y-5">
          {selectedEvent ? (
            <>
              {/* Event Header & Action Bar */}
              <div className="pb-4 border-b border-[#E5E7EB] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={selectedEvent.severity} size="sm" />
                    <span className="text-xs font-mono font-semibold text-[#6B7280]">
                      {selectedEvent.id}
                    </span>
                    <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-neutral-100 text-neutral-600 font-medium">
                      {selectedEvent.eventType.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <h2 className="text-lg font-semibold text-[#171717] mt-1.5 tracking-tight">
                    {selectedEvent.ruleName}
                  </h2>
                  <p className="text-xs text-[#6B7280] font-mono mt-0.5 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-[#9CA3AF]" />
                    <span>Logged at {selectedEvent.timestamp}</span>
                  </p>
                </div>

                {/* Triage Actions */}
                <div className="flex items-center gap-2">
                  {selectedEvent.status === 'open' && (
                    <button
                      onClick={() => handleUpdateStatus(selectedEvent.id, 'investigating')}
                      disabled={actionLoading}
                      className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-xs font-medium rounded transition-swiss cursor-pointer"
                    >
                      Acknowledge Event
                    </button>
                  )}
                  {selectedEvent.status !== 'resolved' && (
                    <button
                      onClick={() => handleUpdateStatus(selectedEvent.id, 'resolved')}
                      disabled={actionLoading}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium rounded transition-swiss cursor-pointer shadow-xs"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Mark Resolved</span>
                    </button>
                  )}
                  {selectedEvent.status === 'resolved' && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-50 text-emerald-700 text-xs font-medium border border-emerald-200">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Resolved
                    </span>
                  )}
                </div>
              </div>

              {/* Forensic Details Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3 bg-[#F9FAFB] border border-[#E5E7EB] rounded-md">
                  <span className="text-[11px] text-[#6B7280] block font-medium">Target IoMT Device</span>
                  <div className="mt-1 flex items-center justify-between">
                    <span className="font-mono font-semibold text-xs text-[#171717]">
                      {selectedEvent.deviceId}
                    </span>
                    <button
                      onClick={() => {
                        setSelectedDeviceId(selectedEvent.deviceId);
                        setCurrentPage('device-detail');
                      }}
                      className="text-[11px] text-[#1677FF] hover:underline flex items-center gap-0.5"
                    >
                      <span>Diagnose</span>
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                <div className="p-3 bg-[#F9FAFB] border border-[#E5E7EB] rounded-md">
                  <span className="text-[11px] text-[#6B7280] block font-medium">Detection Sensor</span>
                  <span className="font-mono font-semibold text-xs text-[#171717] mt-1 block">
                    {selectedEvent.ruleId.startsWith('SURICATA') ? 'Suricata EVE-IDS' : selectedEvent.ruleId.startsWith('ZEEK') ? 'Zeek Bro-Sensor' : 'IoMT Heuristic IDS'}
                  </span>
                </div>

                <div className="p-3 bg-[#F9FAFB] border border-[#E5E7EB] rounded-md">
                  <span className="text-[11px] text-[#6B7280] block font-medium">Triage Status</span>
                  <div className="mt-1 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#1677FF]" />
                    <span className="font-mono font-semibold text-xs text-[#171717] capitalize">
                      {selectedEvent.status}
                    </span>
                  </div>
                </div>
              </div>

              {/* Clinical Impact & Description */}
              <div className="space-y-2">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-[#6B7280]">
                  Clinical Context & Security Threat Description
                </h3>
                <div className="p-3.5 bg-neutral-50 border border-neutral-200 rounded-md text-xs text-[#374151] leading-relaxed">
                  <p>
                    Heuristic engine triggered rule <strong className="font-mono text-[#171717]">{selectedEvent.ruleId}</strong> on endpoint <strong className="font-mono text-[#171717]">{selectedEvent.deviceId}</strong>.
                    Anomaly signature detected abnormal traffic behavior consistent with healthcare protocol deviation or unauthorized service enumeration.
                  </p>
                  <p className="mt-2 text-[#6B7280]">
                    Clinical impact assessment: Active telemetry fluctuations require immediate operational verification to ensure patient vital parameter delivery remains undisturbed.
                  </p>
                </div>
              </div>

              {/* Recommended Response Action */}
              <div className="space-y-2">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-[#6B7280]">
                  Clinical Recommendations & Suggested Remediation
                </h3>
                <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-md text-xs text-blue-950 leading-relaxed flex items-start gap-2.5">
                  <Shield className="w-4 h-4 text-[#1677FF] shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-[#1677FF]">Defensive Containment Protocol:</p>
                    <p className="mt-0.5">{selectedEvent.suggestedAction}</p>
                  </div>
                </div>
              </div>

              {/* Packet Payload / Raw Evidence JSON Viewer */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-[#6B7280]">
                    Packet Payload & Forensic Evidence
                  </h3>
                  <button
                    onClick={handleCopyEvidence}
                    className="text-[11px] font-mono text-[#6B7280] hover:text-[#171717] flex items-center gap-1 px-2 py-0.5 rounded border border-[#E5E7EB] hover:bg-[#F9FAFB] transition-swiss cursor-pointer"
                  >
                    {copiedEvidence ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedEvidence ? 'Copied' : 'Copy Evidence JSON'}</span>
                  </button>
                </div>

                <div className="relative rounded-md overflow-hidden border border-neutral-800">
                  <div className="bg-neutral-900 px-3 py-1.5 border-b border-neutral-800 text-[10px] font-mono text-neutral-400 flex items-center justify-between">
                    <span>TELEMETRY_PAYLOAD_SCHEMA // JSON</span>
                    <span>SIZE: {JSON.stringify(selectedEvent.evidence || {}).length} BYTES</span>
                  </div>
                  <pre className="p-3.5 bg-[#121212] text-emerald-400 font-mono text-xs overflow-x-auto max-h-60 leading-relaxed scrollbar-thin">
                    {JSON.stringify(selectedEvent.evidence || {}, null, 2)}
                  </pre>
                </div>
              </div>

              {/* Navigation Quick Links */}
              <div className="pt-2 border-t border-[#E5E7EB] flex items-center justify-between text-xs">
                <button
                  onClick={() => setCurrentPage('devices-scan')}
                  className="text-[#1677FF] hover:underline flex items-center gap-1 font-medium cursor-pointer"
                >
                  <Shield className="w-3.5 h-3.5" />
                  <span>Execute Assessment Scan on this Device &rarr;</span>
                </button>
                <button
                  onClick={() => setCurrentPage('reports')}
                  className="text-[#6B7280] hover:text-[#171717] hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>View Security Reports</span>
                </button>
              </div>
            </>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 text-[#6B7280]">
              <AlertTriangle className="w-10 h-10 text-[#9CA3AF] stroke-[1.5] mb-2" />
              <p className="font-semibold text-sm text-[#171717]">Select a Security Event</p>
              <p className="text-xs text-[#9CA3AF] mt-1 max-w-sm">
                Choose an alert from the left event queue to inspect deep forensic evidence, source telemetry packets, and clinical recommendations.
              </p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
