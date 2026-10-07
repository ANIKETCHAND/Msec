import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';
import {
  ClipboardList,
  Search,
  Filter,
  ShieldAlert,
  Lock,
  UserCheck,
  FileSpreadsheet,
  Download,
  AlertCircle,
  ShieldCheck,
  RefreshCw,
  CheckCircle2,
  Hash
} from 'lucide-react';

export default function AuditLogsPage() {
  const { auditLogs, currentUser } = useApp();
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('ALL');

  // Chain verification state
  const [verifying, setVerifying] = useState(false);
  const [chainResult, setChainResult] = useState(null);

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

  const handleVerifyChain = async () => {
    setVerifying(true);
    try {
      const res = await api.verifyAuditChain();
      setChainResult(res);
    } catch (err) {
      setChainResult({ chain_valid: false, error: err.message || 'Chain verification failed.' });
    } finally {
      setVerifying(false);
    }
  };

  const filteredLogs = auditLogs.filter(log => {
    const matchSearch =
      log.id.toLowerCase().includes(search.toLowerCase()) ||
      log.actor.toLowerCase().includes(search.toLowerCase()) ||
      log.action.toLowerCase().includes(search.toLowerCase()) ||
      (log.details && log.details.toLowerCase().includes(search.toLowerCase()));

    const matchAction = actionFilter === 'ALL' || log.action === actionFilter;
    return matchSearch && matchAction;
  });

  const exportCsv = () => {
    const headers = "ID,Timestamp,Actor,Role,Action,EntityType,EntityID,IPAddress,Details\n";
    const rows = filteredLogs.map(l =>
      `"${l.id}","${l.timestamp}","${l.actor}","${l.role}","${l.action}","${l.entityType}","${l.entityId}","${l.ipAddress}","${(l.details || '').replace(/"/g, '""')}"`
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
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-mediblue-400" />
              Cryptographically Chained Audit Trail
            </h1>
            <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-mediblue-500/10 text-mediblue-400 border border-mediblue-500/30">
              SHA-256 Hash Chain
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Immutable, tamper-evident forensic log protected by sequential cryptographic hash links.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleVerifyChain}
            disabled={verifying}
            className="px-3.5 py-2 bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 rounded-xl text-xs font-semibold flex items-center gap-2 transition"
          >
            <ShieldCheck className={`w-4 h-4 ${verifying ? 'animate-spin' : ''}`} />
            {verifying ? 'Verifying Chain...' : 'Verify Cryptographic Hash Chain'}
          </button>

          <button
            onClick={exportCsv}
            className="px-3.5 py-2 bg-navy-800 hover:bg-navy-700 text-slate-200 border border-navy-700 rounded-xl text-xs font-semibold flex items-center gap-2 transition"
          >
            <Download className="w-4 h-4 text-mediblue-400" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Hash Chain Verification Result Banner */}
      {chainResult && (
        <div className={`p-4 rounded-2xl border flex items-center justify-between text-xs shadow-xl ${
          chainResult.chain_valid
            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
            : 'bg-red-500/10 border-red-500/30 text-red-300'
        }`}>
          <div className="flex items-center gap-3">
            {chainResult.chain_valid ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
            )}
            <div>
              <strong className="font-bold block text-sm">
                {chainResult.chain_valid ? 'Hash Chain Integrity Intact & Verified' : 'Cryptographic Hash Chain Broken!'}
              </strong>
              <p className="text-[11px] opacity-90 mt-0.5">
                {chainResult.message || chainResult.error}
              </p>
            </div>
          </div>

          {chainResult.head_hash && (
            <div className="text-right font-mono text-[11px] bg-navy-950/80 px-3 py-1.5 rounded-xl border border-navy-800">
              <span className="text-slate-400 block text-[9px]">HEAD HASH DIGEST:</span>
              <span className="text-emerald-400">{chainResult.head_hash.slice(0, 20)}...</span>
            </div>
          )}
        </div>
      )}

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
            <option value="ASSESSMENT_SCOPE_AUTHORIZED">ASSESSMENT_SCOPE_AUTHORIZED</option>
            <option value="ASSESSMENT_EXECUTED">ASSESSMENT_EXECUTED</option>
            <option value="INCIDENT_UPDATE">INCIDENT_UPDATE</option>
            <option value="DEVICE_STATUS_CHANGE">DEVICE_STATUS_CHANGE</option>
            <option value="INCIDENT_CONTAINMENT_SIMULATED">INCIDENT_CONTAINMENT_SIMULATED</option>
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
