import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  FileText,
  Search,
  CheckCircle2,
  Clock,
  AlertTriangle,
  User,
  Plus,
  Send,
  ShieldAlert,
  ChevronRight,
  Filter,
  CheckCircle,
  XCircle,
  X
} from 'lucide-react';

export default function IncidentManagementPage() {
  const { incidents, updateIncidentStatus, currentUser, setSelectedDeviceId, setCurrentPage } = useApp();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedIncident, setSelectedIncident] = useState(incidents[0] || null);
  const [newNoteText, setNewNoteText] = useState('');

  const filteredIncidents = incidents.filter(inc => {
    const matchSearch =
      inc.id.toLowerCase().includes(search.toLowerCase()) ||
      inc.title.toLowerCase().includes(search.toLowerCase()) ||
      inc.description.toLowerCase().includes(search.toLowerCase());

    const matchStatus = statusFilter === 'ALL' || inc.status.toUpperCase() === statusFilter;
    return matchSearch && matchStatus;
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

  const getStatusBadge = (status) => {
    switch (status.toLowerCase()) {
      case 'new':
        return 'bg-sky-500/20 text-sky-400 border-sky-500/30';
      case 'investigating':
        return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
      case 'resolved':
        return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
      default:
        return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
    }
  };

  const handleAddNote = (e) => {
    e.preventDefault();
    if (!newNoteText.trim() || !selectedIncident) return;
    updateIncidentStatus(selectedIncident.id, selectedIncident.status, newNoteText.trim());
    setNewNoteText('');
  };

  const handleTransition = (newStatus) => {
    if (!selectedIncident) return;
    updateIncidentStatus(selectedIncident.id, newStatus, `Transitioned status to ${newStatus}.`);
  };

  // Re-sync selected incident if incidents array updates
  const activeIncident = incidents.find(i => i.id === selectedIncident?.id) || selectedIncident;

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div>
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          <FileText className="w-5 h-5 text-mediblue-400" />
          IoMT Incident Management & Triage
        </h1>
        <p className="text-xs text-slate-400">
          Structured response workflows, forensic investigation notes, and status transitions for IoMT security events.
        </p>
      </div>

      {/* Main Grid: Left Ticket List, Right Active Ticket Investigation */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Tickets Queue (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-navy-900 border border-navy-800 p-4 rounded-2xl space-y-3">
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Search incidents..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-navy-950 border border-navy-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-mediblue-500"
              />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-navy-950 border border-navy-700 rounded-xl px-2 py-1.5 text-xs text-slate-200 focus:outline-none"
              >
                <option value="ALL">All</option>
                <option value="NEW">New</option>
                <option value="INVESTIGATING">Investigating</option>
                <option value="RESOLVED">Resolved</option>
                <option value="CLOSED">Closed</option>
              </select>
            </div>

            <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
              {filteredIncidents.map(inc => {
                const isSelected = activeIncident?.id === inc.id;
                return (
                  <button
                    key={inc.id}
                    onClick={() => setSelectedIncident(inc)}
                    className={`
                      w-full text-left p-3.5 rounded-xl border transition
                      ${isSelected
                        ? 'bg-navy-800 border-mediblue-500 shadow-md'
                        : 'bg-navy-950/60 border-navy-800 hover:bg-navy-850 hover:border-navy-700'
                      }
                    `}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[11px] font-bold text-mediblue-400">{inc.id}</span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${getSeverityBadge(inc.severity)}`}>
                        {inc.severity.toUpperCase()}
                      </span>
                    </div>

                    <h3 className="font-semibold text-xs text-white mt-1 line-clamp-1">{inc.title}</h3>
                    <p className="text-[11px] text-slate-400 line-clamp-2 mt-0.5">{inc.description}</p>

                    <div className="flex items-center justify-between text-[10px] text-slate-400 mt-2.5 pt-2 border-t border-navy-800/80">
                      <span className="capitalize">{inc.status}</span>
                      <span>{inc.assignedTo}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Incident Workspace & Notes (7 cols) */}
        <div className="lg:col-span-7">
          {activeIncident ? (
            <div className="bg-navy-900 border border-navy-800 rounded-2xl p-6 space-y-6 shadow-xl">
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-navy-800 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-mediblue-400">{activeIncident.id}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${getStatusBadge(activeIncident.status)}`}>
                      {activeIncident.status.toUpperCase()}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${getSeverityBadge(activeIncident.severity)}`}>
                      {activeIncident.severity.toUpperCase()}
                    </span>
                  </div>
                  <h2 className="text-base font-bold text-white mt-1">{activeIncident.title}</h2>
                </div>

                {/* Workflow Transitions (Analyst & Admin only) */}
                {currentUser.role !== 'Doctor Demo' && (
                  <div className="flex items-center gap-1.5 text-xs">
                    {activeIncident.status === 'new' && (
                      <button
                        onClick={() => handleTransition('investigating')}
                        className="px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 border border-amber-500/30 rounded-xl font-semibold transition"
                      >
                        Start Investigation
                      </button>
                    )}
                    {activeIncident.status === 'investigating' && (
                      <button
                        onClick={() => handleTransition('resolved')}
                        className="px-3 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/30 rounded-xl font-semibold transition"
                      >
                        Mark Resolved
                      </button>
                    )}
                    {activeIncident.status === 'resolved' && (
                      <button
                        onClick={() => handleTransition('closed')}
                        className="px-3 py-1.5 bg-slate-500/20 hover:bg-slate-500/30 text-slate-300 border border-slate-500/30 rounded-xl font-semibold transition"
                      >
                        Close Incident
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Meta details */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3.5 bg-navy-950 rounded-xl border border-navy-800 text-xs">
                <div>
                  <span className="text-slate-400">Target Device:</span>
                  <div className="font-semibold text-white">
                    <button
                      onClick={() => { setSelectedDeviceId(activeIncident.deviceId); setCurrentPage('device-detail'); }}
                      className="text-mediblue-400 hover:underline"
                    >
                      {activeIncident.deviceId}
                    </button>
                  </div>
                </div>
                <div>
                  <span className="text-slate-400">Assigned Investigator:</span>
                  <div className="font-semibold text-white">{activeIncident.assignedTo}</div>
                </div>
                <div>
                  <span className="text-slate-400">Opened At:</span>
                  <div className="text-slate-300 font-mono text-[11px]">{activeIncident.createdAt}</div>
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1">
                <span className="text-xs font-semibold text-slate-300">Incident Narrative:</span>
                <p className="text-xs text-slate-300 bg-navy-950/60 p-3 rounded-xl border border-navy-800/80 leading-relaxed">
                  {activeIncident.description}
                </p>
              </div>

              {/* Investigation Journal / Notes */}
              <div className="space-y-3">
                <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-mediblue-400" />
                  Investigation Notes & Audit Trail
                </span>

                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {activeIncident.notes.map((n, idx) => (
                    <div key={idx} className="p-3 bg-navy-950/80 rounded-xl border border-navy-800/80 text-xs space-y-1">
                      <div className="flex items-center justify-between text-[10px] text-slate-400">
                        <span className="font-bold text-slate-300">{n.author}</span>
                        <span>{n.time}</span>
                      </div>
                      <p className="text-slate-300">{n.text}</p>
                    </div>
                  ))}
                </div>

                {/* Add Note Form */}
                {currentUser.role !== 'Doctor Demo' ? (
                  <form onSubmit={handleAddNote} className="flex gap-2 pt-2">
                    <input
                      type="text"
                      placeholder="Add forensic finding or containment note..."
                      value={newNoteText}
                      onChange={(e) => setNewNoteText(e.target.value)}
                      className="flex-1 bg-navy-950 border border-navy-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-mediblue-500"
                    />
                    <button
                      type="submit"
                      className="px-4 py-2 bg-mediblue-600 hover:bg-mediblue-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition"
                    >
                      <Send className="w-3.5 h-3.5" /> Post
                    </button>
                  </form>
                ) : (
                  <p className="text-[11px] text-slate-400 italic">Doctor role: Read-only access to incident journal.</p>
                )}
              </div>
            </div>
          ) : (
            <div className="p-12 text-center text-slate-400 bg-navy-900 border border-navy-800 rounded-2xl">
              Select an incident from the queue to review forensic findings.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
