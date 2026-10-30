import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';
import StatusBadge from '../components/common/StatusBadge';
import {
  FileText,
  Search,
  CheckCircle2,
  Clock,
  AlertTriangle,
  User,
  Plus,
  Send,
  ChevronRight,
  Filter,
  CheckCircle,
  XCircle,
  X,
  RefreshCw,
  ShieldAlert,
  GitBranch,
  ShieldCheck,
  Check,
  Activity
} from 'lucide-react';

const LIFECYCLE_STATUSES = [
  { value: 'new', label: 'New', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  { value: 'investigating', label: 'In Investigation', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  { value: 'contained', label: 'Contained', color: 'bg-purple-50 text-purple-700 border-purple-200' },
  { value: 'resolved', label: 'Resolved', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  { value: 'closed', label: 'Closed', color: 'bg-neutral-100 text-neutral-700 border-neutral-300' },
  { value: 'false_positive', label: 'False Positive', color: 'bg-slate-100 text-slate-700 border-slate-300' },
  { value: 'accepted_risk', label: 'Accepted Risk', color: 'bg-orange-50 text-orange-700 border-orange-200' }
];

export default function IncidentManagementPage() {
  const {
    incidents: contextIncidents,
    currentUser,
    setSelectedDeviceId,
    setCurrentPage,
    logAudit
  } = useApp();

  const [incidents, setIncidents] = useState(contextIncidents);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [severityFilter, setSeverityFilter] = useState('ALL');
  const [selectedIncident, setSelectedIncident] = useState(contextIncidents[0] || null);
  const [newNoteText, setNewNoteText] = useState('');
  const [postingNote, setPostingNote] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [correlating, setCorrelating] = useState(false);
  const [actionFeedback, setActionFeedback] = useState(null);

  // Fetch fresh incidents from backend
  const fetchIncidents = async () => {
    setLoading(true);
    try {
      const data = await api.getIncidents();
      if (Array.isArray(data) && data.length > 0) {
        const mapped = data.map(i => ({
          id: i.id,
          title: i.title,
          description: i.description,
          severity: (i.severity || 'medium').toLowerCase(),
          status: (i.status || 'new').toLowerCase(),
          assignedTo: i.assigned_to || 'Unassigned',
          deviceId: i.device_id || 'N/A',
          resolutionNotes: i.resolution_notes || '',
          createdAt: i.created_at ? new Date(i.created_at).toLocaleTimeString() : 'Recent',
          updatedAt: i.updated_at ? new Date(i.updated_at).toLocaleTimeString() : 'Recent',
          notes: i.notes || []
        }));
        setIncidents(mapped);
        if (selectedIncident) {
          const freshSelected = mapped.find(m => m.id === selectedIncident.id) || mapped[0];
          setSelectedIncident(freshSelected);
        } else {
          setSelectedIncident(mapped[0]);
        }
      }
    } catch (err) {
      console.warn('[Incidents] Failed to fetch live incidents, using local state:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIncidents();
  }, []);

  const filteredIncidents = incidents.filter(inc => {
    const matchSearch =
      (inc.id || '').toLowerCase().includes(search.toLowerCase()) ||
      (inc.title || '').toLowerCase().includes(search.toLowerCase()) ||
      (inc.description || '').toLowerCase().includes(search.toLowerCase()) ||
      (inc.deviceId || '').toLowerCase().includes(search.toLowerCase());

    const incStatus = (inc.status || '').toLowerCase();
    const matchStatus = statusFilter === 'ALL' || incStatus === statusFilter.toLowerCase();
    const incSev = (inc.severity || '').toLowerCase();
    const matchSev = severityFilter === 'ALL' || incSev === severityFilter.toLowerCase();

    return matchSearch && matchStatus && matchSev;
  });

  const handleAddNote = async (e) => {
    e.preventDefault();
    if (!newNoteText.trim() || !selectedIncident) return;
    setPostingNote(true);
    setActionFeedback(null);

    const notePayload = newNoteText.trim();
    try {
      // Call persistent API endpoint
      const updated = await api.addIncidentNote(selectedIncident.id, notePayload);
      
      const newNote = {
        author: currentUser?.name || 'Security Analyst',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        text: notePayload
      };

      const updatedNotes = [...(selectedIncident.notes || []), newNote];
      const updatedInc = {
        ...selectedIncident,
        notes: updatedNotes,
        updatedAt: 'Just now'
      };

      setSelectedIncident(updatedInc);
      setIncidents(prev => prev.map(i => i.id === selectedIncident.id ? updatedInc : i));
      setNewNoteText('');
      setActionFeedback({ type: 'success', message: 'Analyst note saved and committed to audit trail.' });
      logAudit('INCIDENT_NOTE_ADDED', 'Incident', selectedIncident.id, `Appended note: ${notePayload.substring(0, 50)}...`);
    } catch (err) {
      console.warn('[Incidents] Add note API failed, fallback to local:', err.message);
      // Local fallback
      const newNote = {
        author: currentUser?.name || 'Security Analyst',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        text: notePayload
      };
      const updatedInc = {
        ...selectedIncident,
        notes: [...(selectedIncident.notes || []), newNote],
        updatedAt: 'Just now'
      };
      setSelectedIncident(updatedInc);
      setIncidents(prev => prev.map(i => i.id === selectedIncident.id ? updatedInc : i));
      setNewNoteText('');
      setActionFeedback({ type: 'success', message: 'Note added locally.' });
    } finally {
      setPostingNote(false);
    }
  };

  const handleTransition = async (newStatus, resolutionNote = null) => {
    if (!selectedIncident) return;
    setUpdatingStatus(true);
    setActionFeedback(null);

    try {
      await api.updateIncidentStatus(selectedIncident.id, newStatus, resolutionNote);
      
      const statusNote = {
        author: currentUser?.name || 'Security Analyst',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        text: `Lifecycle status transitioned to ${newStatus.toUpperCase()}.${resolutionNote ? ` Notes: ${resolutionNote}` : ''}`
      };

      const updatedInc = {
        ...selectedIncident,
        status: newStatus.toLowerCase(),
        notes: [...(selectedIncident.notes || []), statusNote],
        updatedAt: 'Just now',
        resolutionNotes: resolutionNote || selectedIncident.resolutionNotes
      };

      setSelectedIncident(updatedInc);
      setIncidents(prev => prev.map(i => i.id === selectedIncident.id ? updatedInc : i));
      setActionFeedback({ type: 'success', message: `Incident successfully moved to ${newStatus.toUpperCase()}.` });
      logAudit('INCIDENT_STATUS_CHANGE', 'Incident', selectedIncident.id, `Status updated to ${newStatus}.`);
    } catch (err) {
      console.warn('[Incidents] Update status API error, updating locally:', err.message);
      const updatedInc = {
        ...selectedIncident,
        status: newStatus.toLowerCase(),
        updatedAt: 'Just now'
      };
      setSelectedIncident(updatedInc);
      setIncidents(prev => prev.map(i => i.id === selectedIncident.id ? updatedInc : i));
      setActionFeedback({ type: 'success', message: `Status updated locally to ${newStatus}.` });
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleCorrelate = async () => {
    if (!selectedIncident || !selectedIncident.deviceId) return;
    setCorrelating(true);
    setActionFeedback(null);

    try {
      const correlated = await api.correlateIncident(selectedIncident.deviceId);
      setActionFeedback({
        type: 'success',
        message: `Correlated attack chain: Created/Updated incident ${correlated.id} with unified multi-stage telemetry.`
      });
      await fetchIncidents();
    } catch (err) {
      setActionFeedback({
        type: 'info',
        message: err.message || `No multi-stage attack patterns identified for device ${selectedIncident.deviceId}.`
      });
    } finally {
      setCorrelating(false);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E5E7EB]">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-semibold text-[#171717] tracking-tight flex items-center gap-2">
              <span>Incident Investigation & Triage</span>
              <span className="text-xs font-mono text-[#6B7280] font-normal">
                ({incidents.length} total tickets)
              </span>
            </h1>
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-[#FAFAFA] text-[#6B7280] border border-[#E5E7EB]">
              ISO/IEC 27035 & NIST SP 800-61
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchIncidents}
            disabled={loading}
            className="p-1.5 rounded border border-[#E5E7EB] hover:bg-[#F9FAFB] text-[#6B7280] hover:text-[#171717] transition-swiss"
            title="Refresh incident tickets"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#1677FF]' : ''}`} />
          </button>
        </div>
      </div>

      {actionFeedback && (
        <div className={`p-3 rounded border text-xs flex items-center justify-between ${
          actionFeedback.type === 'error'
            ? 'bg-red-50 border-red-200 text-red-800'
            : actionFeedback.type === 'info'
            ? 'bg-blue-50 border-blue-200 text-blue-800'
            : 'bg-emerald-50 border-emerald-200 text-emerald-800'
        }`}>
          <span>{actionFeedback.message}</span>
          <button onClick={() => setActionFeedback(null)} className="text-xs font-mono">&times;</button>
        </div>
      )}

      {/* 2. Controls */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
        <div className="sm:col-span-6 relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tickets by ID, title, device, evidence summary..."
            className="w-full bg-white text-xs text-[#171717] placeholder-[#9CA3AF] pl-8 pr-3 py-2 rounded border border-[#E5E7EB] focus:border-[#1677FF] focus:outline-none transition-swiss font-mono"
          />
        </div>

        <div className="sm:col-span-3">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full bg-white text-xs text-[#171717] px-2.5 py-2 rounded border border-[#E5E7EB] focus:border-[#1677FF] focus:outline-none transition-swiss font-mono"
          >
            <option value="ALL">Status: All Lifecycles</option>
            {LIFECYCLE_STATUSES.map(s => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>

        <div className="sm:col-span-3">
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="w-full bg-white text-xs text-[#171717] px-2.5 py-2 rounded border border-[#E5E7EB] focus:border-[#1677FF] focus:outline-none transition-swiss font-mono"
          >
            <option value="ALL">Severity: All</option>
            <option value="critical">Severity: Critical</option>
            <option value="high">Severity: High</option>
            <option value="medium">Severity: Medium</option>
            <option value="low">Severity: Low</option>
          </select>
        </div>
      </div>

      {/* 3. 2-Column Split: Ticket List (Left 5 cols) & Investigation Panel (Right 7 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Ticket List */}
        <div className="lg:col-span-5 bg-white border border-[#E5E7EB] rounded-lg overflow-hidden shadow-xs">
          <div className="px-4 py-3 bg-[#F9FAFB] border-b border-[#E5E7EB] flex items-center justify-between text-xs font-semibold uppercase text-[#6B7280]">
            <span>Incident Queue ({filteredIncidents.length})</span>
            <span className="text-[11px] font-mono font-normal">Active tickets</span>
          </div>

          <div className="divide-y divide-[#F3F4F6] max-h-[640px] overflow-y-auto">
            {filteredIncidents.length === 0 ? (
              <div className="py-12 text-center text-xs text-[#6B7280]">
                No incident tickets match current filter.
              </div>
            ) : (
              filteredIncidents.map((inc) => {
                const isSelected = selectedIncident?.id === inc.id;
                const statusMeta = LIFECYCLE_STATUSES.find(s => s.value === inc.status.toLowerCase());
                return (
                  <div
                    key={inc.id}
                    onClick={() => setSelectedIncident(inc)}
                    className={`p-4 cursor-pointer transition-swiss border-l-3 ${
                      isSelected
                        ? 'bg-[#E6F4FF]/40 border-l-[#1677FF]'
                        : 'hover:bg-[#F9FAFB] border-l-transparent'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-mono text-xs font-semibold text-[#171717]">{inc.id}</span>
                      <div className="flex items-center gap-1.5">
                        <StatusBadge status={inc.severity} size="xs" />
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-medium border ${statusMeta?.color || 'bg-gray-100 text-gray-700'}`}>
                          {statusMeta?.label || inc.status}
                        </span>
                      </div>
                    </div>

                    <h4 className="text-xs font-semibold text-[#171717] line-clamp-1">{inc.title}</h4>
                    <p className="text-[11px] text-[#6B7280] line-clamp-2 mt-1 leading-relaxed">
                      {inc.description}
                    </p>

                    <div className="mt-2.5 flex items-center justify-between text-[11px] text-[#6B7280] font-mono">
                      <span>{inc.assignedTo}</span>
                      <span className="text-[10px]">{inc.deviceId}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Selected Incident Details Panel */}
        <div className="lg:col-span-7 bg-white border border-[#E5E7EB] rounded-lg p-5 space-y-5 shadow-xs">
          {selectedIncident ? (
            <>
              {/* Header */}
              <div className="pb-4 border-b border-[#F3F4F6] flex flex-col gap-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-[#6B7280] font-semibold">{selectedIncident.id}</span>
                    <StatusBadge status={selectedIncident.severity} size="xs" />
                    <span className={`px-2 py-0.5 rounded text-[11px] font-mono font-semibold border ${
                      LIFECYCLE_STATUSES.find(s => s.value === selectedIncident.status.toLowerCase())?.color || 'bg-gray-100'
                    }`}>
                      {LIFECYCLE_STATUSES.find(s => s.value === selectedIncident.status.toLowerCase())?.label || selectedIncident.status.toUpperCase()}
                    </span>
                  </div>

                  {/* Correlate Button */}
                  <button
                    onClick={handleCorrelate}
                    disabled={correlating}
                    className="px-2.5 py-1 rounded border border-[#E5E7EB] hover:bg-[#F9FAFB] text-xs font-medium text-[#1677FF] flex items-center gap-1 transition-swiss"
                    title="Correlate multi-stage attacks across this device"
                  >
                    <GitBranch className={`w-3.5 h-3.5 ${correlating ? 'animate-spin' : ''}`} />
                    <span>Correlate Attack Chain</span>
                  </button>
                </div>

                <h2 className="text-base font-semibold text-[#171717]">{selectedIncident.title}</h2>

                {/* Status Lifecycle Transition Controls */}
                <div className="pt-2 border-t border-[#F3F4F6]">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <span className="text-[11px] font-semibold text-[#6B7280] uppercase tracking-wider">
                      Lifecycle Transition:
                    </span>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {selectedIncident.status !== 'investigating' && (
                        <button
                          onClick={() => handleTransition('investigating')}
                          disabled={updatingStatus}
                          className="px-2.5 py-1 rounded bg-blue-50 text-blue-700 hover:bg-blue-100 text-xs font-medium border border-blue-200 transition-swiss"
                        >
                          Investigate
                        </button>
                      )}
                      {selectedIncident.status !== 'contained' && (
                        <button
                          onClick={() => handleTransition('contained')}
                          disabled={updatingStatus}
                          className="px-2.5 py-1 rounded bg-purple-50 text-purple-700 hover:bg-purple-100 text-xs font-medium border border-purple-200 transition-swiss"
                        >
                          Contain Threat
                        </button>
                      )}
                      {selectedIncident.status !== 'resolved' && (
                        <button
                          onClick={() => handleTransition('resolved')}
                          disabled={updatingStatus}
                          className="px-2.5 py-1 rounded bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-xs font-medium border border-emerald-200 transition-swiss"
                        >
                          Resolve
                        </button>
                      )}
                      {selectedIncident.status !== 'closed' && (
                        <button
                          onClick={() => handleTransition('closed')}
                          disabled={updatingStatus}
                          className="px-2.5 py-1 rounded bg-neutral-100 text-neutral-700 hover:bg-neutral-200 text-xs font-medium border border-neutral-300 transition-swiss"
                        >
                          Close Ticket
                        </button>
                      )}
                      {selectedIncident.status !== 'false_positive' && (
                        <button
                          onClick={() => handleTransition('false_positive')}
                          disabled={updatingStatus}
                          className="px-2.5 py-1 rounded bg-slate-100 text-slate-700 hover:bg-slate-200 text-xs font-medium border border-slate-300 transition-swiss"
                        >
                          False Positive
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Description & Target Endpoint */}
              <div className="space-y-3 text-xs">
                <div>
                  <span className="text-[#6B7280] font-medium uppercase text-[10px] tracking-wider block mb-1">
                    Description & Forensic Findings
                  </span>
                  <p className="p-3 bg-[#F9FAFB] border border-[#E5E7EB] rounded text-[#171717] leading-relaxed font-sans">
                    {selectedIncident.description}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3 p-3 bg-[#F9FAFB] border border-[#E5E7EB] rounded">
                  <div>
                    <span className="text-[#6B7280] text-[11px] block">Target Medical Endpoint</span>
                    <button
                      onClick={() => {
                        setSelectedDeviceId(selectedIncident.deviceId);
                        setCurrentPage('device-detail');
                      }}
                      className="font-mono text-[#1677FF] hover:underline font-semibold"
                    >
                      {selectedIncident.deviceId} &rarr;
                    </button>
                  </div>
                  <div>
                    <span className="text-[#6B7280] text-[11px] block">Assigned Security Lead</span>
                    <span className="font-medium text-[#171717]">{selectedIncident.assignedTo}</span>
                  </div>
                </div>
              </div>

              {/* Notes & Audit Timeline */}
              <div className="space-y-3 pt-2">
                <span className="text-[#6B7280] font-medium uppercase text-[10px] tracking-wider block">
                  Analyst Timeline & Remediation Notes ({selectedIncident.notes?.length || 0})
                </span>

                <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                  {(selectedIncident.notes || []).length === 0 ? (
                    <p className="p-3 bg-[#F9FAFB] border border-[#E5E7EB] rounded text-center text-xs text-[#9CA3AF]">
                      No analyst notes recorded yet. Post findings or remediation actions below.
                    </p>
                  ) : (
                    (selectedIncident.notes || []).map((n, idx) => (
                      <div key={idx} className="p-2.5 bg-[#F9FAFB] border border-[#E5E7EB] rounded text-xs">
                        <div className="flex items-center justify-between text-[11px] text-[#6B7280] mb-1 font-mono">
                          <span className="font-semibold text-[#171717]">{n.author || 'Analyst'}</span>
                          <span>{n.time || 'Recent'}</span>
                        </div>
                        <p className="text-[#171717] leading-relaxed">{n.text || n.content}</p>
                      </div>
                    ))
                  )}
                </div>

                {/* Add Note Form */}
                <form onSubmit={handleAddNote} className="flex items-center gap-2 pt-2">
                  <input
                    type="text"
                    placeholder="Add investigation findings, forensic notes, or remediation action..."
                    value={newNoteText}
                    onChange={(e) => setNewNoteText(e.target.value)}
                    disabled={postingNote}
                    className="flex-1 bg-white border border-[#E5E7EB] rounded px-3 py-2 text-xs text-[#171717] focus:outline-none focus:border-[#1677FF] transition-swiss font-mono"
                  />
                  <button
                    type="submit"
                    disabled={!newNoteText.trim() || postingNote}
                    className="px-4 py-2 rounded bg-[#1677FF] hover:bg-[#0958D9] disabled:opacity-40 text-white text-xs font-semibold transition-swiss cursor-pointer flex items-center gap-1.5"
                  >
                    <span>Post Note</span>
                    {postingNote && <RefreshCw className="w-3 h-3 animate-spin" />}
                  </button>
                </form>
              </div>
            </>
          ) : (
            <div className="py-16 text-center text-xs text-[#6B7280]">
              <ShieldAlert className="w-8 h-8 mx-auto mb-2 text-[#9CA3AF]" />
              <p>Select an incident from the queue to view full investigation findings.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
