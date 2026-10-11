import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
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

  const handleAddNote = (e) => {
    e.preventDefault();
    if (!newNoteText.trim() || !selectedIncident) return;
    updateIncidentStatus(selectedIncident.id, selectedIncident.status, newNoteText.trim());
    setNewNoteText('');
  };

  const handleTransition = (newStatus) => {
    if (!selectedIncident) return;
    updateIncidentStatus(selectedIncident.id, newStatus, `Transitioned incident to ${newStatus}.`);
  };

  return (
    <div className="space-y-6">
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E5E7EB]">
        <div>
          <h1 className="text-xl font-semibold text-[#171717] tracking-tight flex items-center gap-2">
            <span>Incident Management</span>
            <span className="text-xs font-mono text-[#6B7280] font-normal">
              ({incidents.length} active tickets)
            </span>
          </h1>
          <p className="text-xs text-[#6B7280] mt-0.5">
            Investigation tickets, analyst assignments, and incident lifecycle management.
          </p>
        </div>
      </div>

      {/* 2. Controls */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
        <div className="sm:col-span-8 relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tickets by ID, title, evidence summary..."
            className="w-full bg-white text-xs text-[#171717] placeholder-[#9CA3AF] pl-8 pr-3 py-2 rounded border border-[#E5E7EB] focus:border-[#1677FF] focus:outline-none transition-swiss font-mono"
          />
        </div>

        <div className="sm:col-span-4">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full bg-white text-xs text-[#171717] px-2.5 py-2 rounded border border-[#E5E7EB] focus:border-[#1677FF] focus:outline-none transition-swiss font-mono"
          >
            <option value="ALL">Status: All Incidents</option>
            <option value="NEW">Status: New</option>
            <option value="INVESTIGATING">Status: In Investigation</option>
            <option value="RESOLVED">Status: Resolved</option>
            <option value="CLOSED">Status: Closed</option>
          </select>
        </div>
      </div>

      {/* 3. 2-Column Split: Ticket List (Left 5 cols) & Investigation Panel (Right 7 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Ticket List */}
        <div className="lg:col-span-5 bg-white border border-[#E5E7EB] rounded-lg overflow-hidden">
          <div className="px-4 py-3 bg-[#F9FAFB] border-b border-[#E5E7EB] text-xs font-semibold uppercase text-[#6B7280]">
            Incident Queue ({filteredIncidents.length})
          </div>

          <div className="divide-y divide-[#F3F4F6] max-h-[600px] overflow-y-auto">
            {filteredIncidents.length === 0 ? (
              <p className="py-8 text-center text-xs text-[#6B7280]">No tickets match filter.</p>
            ) : (
              filteredIncidents.map((inc) => {
                const isSelected = selectedIncident?.id === inc.id;
                return (
                  <div
                    key={inc.id}
                    onClick={() => setSelectedIncident(inc)}
                    className={`p-4 cursor-pointer transition-swiss border-l-2 ${
                      isSelected ? 'bg-[#E6F4FF]/50 border-l-[#1677FF]' : 'hover:bg-[#F9FAFB] border-l-transparent'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-mono text-xs font-semibold text-[#171717]">{inc.id}</span>
                      <StatusBadge status={inc.severity} size="xs" />
                    </div>

                    <h4 className="text-xs font-semibold text-[#171717] line-clamp-1">{inc.title}</h4>
                    <p className="text-[11px] text-[#6B7280] line-clamp-2 mt-1 leading-relaxed">{inc.description}</p>

                    <div className="mt-2.5 flex items-center justify-between text-[11px] text-[#6B7280] font-mono">
                      <span>{inc.assignedTo}</span>
                      <StatusBadge status={inc.status} size="xs" />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Selected Incident Details Panel */}
        <div className="lg:col-span-7 bg-white border border-[#E5E7EB] rounded-lg p-5 space-y-5">
          {selectedIncident ? (
            <>
              {/* Header */}
              <div className="pb-4 border-b border-[#F3F4F6] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-[#6B7280]">{selectedIncident.id}</span>
                    <StatusBadge status={selectedIncident.severity} size="xs" />
                    <StatusBadge status={selectedIncident.status} size="xs" />
                  </div>
                  <h2 className="text-base font-semibold text-[#171717] mt-1">{selectedIncident.title}</h2>
                </div>

                {/* Transition Actions */}
                {currentUser.role !== 'Doctor Demo' && (
                  <div className="flex items-center gap-1.5 text-xs">
                    {selectedIncident.status !== 'investigating' && selectedIncident.status !== 'resolved' && (
                      <button
                        onClick={() => handleTransition('investigating')}
                        className="px-2.5 py-1 rounded bg-[#E6F4FF] text-[#1677FF] hover:bg-blue-100 font-medium transition-swiss"
                      >
                        Investigate
                      </button>
                    )}
                    {selectedIncident.status !== 'resolved' && (
                      <button
                        onClick={() => handleTransition('resolved')}
                        className="px-2.5 py-1 rounded bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-medium transition-swiss"
                      >
                        Resolve
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Description & Target Endpoint */}
              <div className="space-y-3 text-xs">
                <div>
                  <span className="text-[#6B7280] font-medium uppercase text-[10px] tracking-wider block mb-1">
                    Description & Forensic Findings
                  </span>
                  <p className="p-3 bg-[#F9FAFB] border border-[#E5E7EB] rounded text-[#171717] leading-relaxed">
                    {selectedIncident.description}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3 p-3 bg-[#F9FAFB] border border-[#E5E7EB] rounded">
                  <div>
                    <span className="text-[#6B7280] text-[11px] block">Target Medical Device</span>
                    <button
                      onClick={() => {
                        setSelectedDeviceId(selectedIncident.deviceId);
                        setCurrentPage('device-detail');
                      }}
                      className="font-mono text-[#1677FF] hover:underline font-semibold"
                    >
                      {selectedIncident.deviceId}
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
                  Analyst Timeline & Notes ({selectedIncident.notes?.length || 0})
                </span>

                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {(selectedIncident.notes || []).map((n, idx) => (
                    <div key={idx} className="p-2.5 bg-[#F9FAFB] border border-[#E5E7EB] rounded text-xs">
                      <div className="flex items-center justify-between text-[11px] text-[#6B7280] mb-1 font-mono">
                        <span className="font-medium text-[#171717]">{n.author}</span>
                        <span>{n.time}</span>
                      </div>
                      <p className="text-[#171717] leading-relaxed">{n.text}</p>
                    </div>
                  ))}
                </div>

                {/* Add Note Form */}
                {currentUser.role !== 'Doctor Demo' && (
                  <form onSubmit={handleAddNote} className="flex items-center gap-2 pt-2">
                    <input
                      type="text"
                      placeholder="Add investigation note or remediation step..."
                      value={newNoteText}
                      onChange={(e) => setNewNoteText(e.target.value)}
                      className="flex-1 bg-white border border-[#E5E7EB] rounded px-3 py-1.5 text-xs text-[#171717] focus:outline-none focus:border-[#1677FF]"
                    />
                    <button
                      type="submit"
                      disabled={!newNoteText.trim()}
                      className="px-3 py-1.5 rounded bg-[#1677FF] hover:bg-[#0958D9] disabled:opacity-40 text-white text-xs font-medium transition-swiss"
                    >
                      Post Note
                    </button>
                  </form>
                )}
              </div>
            </>
          ) : (
            <p className="py-12 text-center text-xs text-[#6B7280]">Select an incident to view details.</p>
          )}
        </div>
      </div>
    </div>
  );
}
