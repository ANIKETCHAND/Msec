import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  ClipboardList,
  Search,
  Filter,
  ShieldAlert,
  Lock,
  UserCheck,
  FileSpreadsheet,
  Download,
  AlertCircle
} from 'lucide-react';

export default function AuditLogsPage() {
  const { auditLogs, currentUser } = useApp();
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('ALL');

  // RBAC check: Doctor Demo cannot view system audit logs
  if (currentUser.role === 'Doctor Demo') {
    return (
      <div className="p-8 text-center bg-navy-900 border border-navy-800 rounded-2xl max-w-lg mx-auto space-y-4 my-12">
        <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/30 text-red-400 mx-auto flex items-center justify-center">
          <Lock className="w-6 h-6" />
        </div>
        <h2 className="text-base font-bold text-white">Access Restricted (RBAC Policy)</h2>
        <p className="text-xs text-slate-400 leading-relaxed">
          The <strong className="text-white">Doctor Demo</strong> persona is restricted to clinical device telemetry.
          Access to system audit logs requires <strong className="text-mediblue-400">Security Analyst</strong> or <strong className="text-mediblue-400">Administrator</strong> privileges.
        </p>
      </div>
    );
  }

  const filteredLogs = auditLogs.filter(log => {
    const matchSearch =
      log.id.toLowerCase().includes(search.toLowerCase()) ||
      log.actor.toLowerCase().includes(search.toLowerCase()) ||
      log.action.toLowerCase().includes(search.toLowerCase()) ||
      log.details.toLowerCase().includes(search.toLowerCase());

    const matchAction = actionFilter === 'ALL' || log.action === actionFilter;
    return matchSearch && matchAction;
  });

  const exportCsv = () => {
    const headers = "ID,Timestamp,Actor,Role,Action,EntityType,EntityID,IPAddress,Details\n";
    const rows = filteredLogs.map(l =>
      `"${l.id}","${l.timestamp}","${l.actor}","${l.role}","${l.action}","${l.entityType}","${l.entityId}","${l.ipAddress}","${l.details.replace(/"/g, '""')}"`
    ).join("\n");

    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `medishield-audit-logs-${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-mediblue-400" />
            Immutable System Audit Trail
          </h1>
          <p className="text-xs text-slate-400">
            Chronological record of user authentication, incident updates, device registrations, and simulations.
          </p>
        </div>

        <button
          onClick={exportCsv}
          className="px-3.5 py-2 bg-navy-800 hover:bg-navy-700 text-slate-200 border border-navy-700 rounded-xl text-xs font-semibold flex items-center gap-2 transition"
        >
          <Download className="w-4 h-4 text-mediblue-400" />
          Export Audit Trail (CSV)
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-navy-900 border border-navy-800 p-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search audit trail..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-navy-950 border border-navy-700 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-mediblue-500"
          />
        </div>

        <div className="w-full sm:w-auto">
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="w-full sm:w-auto bg-navy-950 border border-navy-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none"
          >
            <option value="ALL">All Recorded Actions</option>
            <option value="USER_LOGIN">USER_LOGIN</option>
            <option value="INCIDENT_UPDATE">INCIDENT_UPDATE</option>
            <option value="DEVICE_STATUS_CHANGE">DEVICE_STATUS_CHANGE</option>
            <option value="SIMULATION_TRIGGERED">SIMULATION_TRIGGERED</option>
            <option value="INTEGRITY_TAMPER_SIMULATION">INTEGRITY_TAMPER_SIMULATION</option>
          </select>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="bg-navy-900 border border-navy-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-navy-950/60 text-slate-400 uppercase text-[10px] tracking-wider border-b border-navy-800">
              <tr>
                <th className="py-3 px-4">Audit ID</th>
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Actor & Role</th>
                <th className="py-3 px-4">Action</th>
                <th className="py-3 px-4">Entity</th>
                <th className="py-3 px-4">IP Address</th>
                <th className="py-3 px-4">Forensic Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-navy-800 text-slate-300">
              {filteredLogs.map(log => (
                <tr key={log.id} className="hover:bg-navy-800/40 transition">
                  <td className="py-3.5 px-4 font-mono font-medium text-mediblue-400">
                    {log.id}
                  </td>
                  <td className="py-3.5 px-4 text-slate-400 font-mono text-[11px] whitespace-nowrap">
                    {log.timestamp}
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="font-semibold text-white">{log.actor}</div>
                    <div className="text-[10px] text-slate-400">{log.role}</div>
                  </td>
                  <td className="py-3.5 px-4 font-mono text-[11px] font-semibold text-emerald-400">
                    {log.action}
                  </td>
                  <td className="py-3.5 px-4 font-mono text-[11px] text-slate-300">
                    {log.entityType} ({log.entityId})
                  </td>
                  <td className="py-3.5 px-4 font-mono text-[11px] text-slate-400">
                    {log.ipAddress}
                  </td>
                  <td className="py-3.5 px-4 text-slate-300 text-[11px] max-w-xs truncate">
                    {log.details}
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
