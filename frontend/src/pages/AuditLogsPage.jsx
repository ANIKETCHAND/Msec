import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';
import StatusBadge from '../components/common/StatusBadge';
import {
  ClipboardList,
  Search,
  Lock,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  Hash
} from 'lucide-react';

export default function AuditLogsPage() {
  const { currentUser } = useApp();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('ALL');

  // SHA-256 Chain verification state
  const [verifying, setVerifying] = useState(false);
  const [chainResult, setChainResult] = useState(null);

  const fetchAuditLogs = async () => {
    if (currentUser?.role === 'Doctor Demo') {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await api.getAuditLogs();
      setLogs(Array.isArray(data) ? data : []);
    } catch (err) {
      if (err.message && err.message.includes('403')) {
        setError('FORBIDDEN');
      } else {
        setError(err.message || 'Failed to load audit logs.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAuditLogs();
  }, [currentUser]);

  // RBAC check: Doctor Demo cannot view system audit logs
  if (currentUser?.role === 'Doctor Demo' || error === 'FORBIDDEN') {
    return (
      <div className="p-8 text-center bg-white border border-[#E5E7EB] rounded-lg max-w-md mx-auto space-y-4 my-12">
        <div className="w-10 h-10 rounded-full bg-rose-50 border border-rose-200 text-[#EF4444] mx-auto flex items-center justify-center">
          <Lock className="w-5 h-5" />
        </div>
        <h2 className="text-sm font-semibold text-[#171717]">Access Restricted by Policy</h2>
        <p className="text-xs text-[#6B7280] leading-relaxed">
          The <strong>Doctor Demo</strong> persona is restricted to clinical telemetry. Viewing system audit logs requires <strong>Security Analyst</strong> or <strong>Administrator</strong> privileges.
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

  const filteredLogs = logs.filter(log => {
    const logId = String(log.id || '');
    const logActor = String(log.actor || '');
    const logAction = String(log.action || '');
    const logDetails = typeof log.details === 'string' ? log.details : JSON.stringify(log.details || '');

    const matchSearch =
      logId.toLowerCase().includes(search.toLowerCase()) ||
      logActor.toLowerCase().includes(search.toLowerCase()) ||
      logAction.toLowerCase().includes(search.toLowerCase()) ||
      logDetails.toLowerCase().includes(search.toLowerCase());

    const matchAction = actionFilter === 'ALL' || log.action === actionFilter;
    return matchSearch && matchAction;
  });

  return (
    <div className="space-y-6">
      {/* 1. Header */}
      <div className="pb-4 border-b border-[#E5E7EB] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-[#171717] tracking-tight flex items-center gap-2">
            <span>Tamper-Evident Audit Trail</span>
            <span className="text-xs font-mono text-[#6B7280] font-normal">
              (Cryptographic SHA-256 Hash Chain)
            </span>
          </h1>
          <p className="text-xs text-[#6B7280] mt-0.5">
            Cryptographically linked audit records verifying immutable operator actions and containment events.
          </p>
        </div>

        <button
          onClick={handleVerifyChain}
          disabled={verifying}
          className="px-3.5 py-1.5 rounded bg-[#1677FF] hover:bg-[#0958D9] text-white text-xs font-medium flex items-center gap-1.5 transition-swiss shadow-xs shrink-0"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${verifying ? 'animate-spin' : ''}`} />
          <span>Verify SHA-256 Hash Chain</span>
        </button>
      </div>

      {/* Chain Verification Result Banner */}
      {chainResult && (
        <div className={`p-4 rounded-lg border text-xs flex items-center justify-between ${
          chainResult.chain_valid
            ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
            : 'bg-rose-50 border-rose-200 text-rose-800'
        }`}>
          <div className="flex items-center gap-2">
            {chainResult.chain_valid ? (
              <CheckCircle2 className="w-4 h-4 text-[#10B981] shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-[#EF4444] shrink-0" />
            )}
            <span>
              <strong>{chainResult.chain_valid ? 'HASH CHAIN INTACT:' : 'HASH MISMATCH DETECTED:'}</strong>{' '}
              {chainResult.verified_count} log entries verified across SHA-256 root block.
            </span>
          </div>
          <button onClick={() => setChainResult(null)} className="text-[#6B7280] hover:text-[#171717]">Dismiss</button>
        </div>
      )}

      {/* 2. Controls */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
        <div className="sm:col-span-8 relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search audit trail by actor email, action, details..."
            className="w-full bg-white text-xs text-[#171717] placeholder-[#9CA3AF] pl-8 pr-3 py-2 rounded border border-[#E5E7EB] focus:border-[#1677FF] focus:outline-none transition-swiss font-mono"
          />
        </div>

        <div className="sm:col-span-4">
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="w-full bg-white text-xs text-[#171717] px-2.5 py-2 rounded border border-[#E5E7EB] focus:border-[#1677FF] focus:outline-none transition-swiss font-mono"
          >
            <option value="ALL">All Recorded Actions</option>
            <option value="ASSESSMENT_SCOPE_AUTHORIZED">ASSESSMENT_SCOPE_AUTHORIZED</option>
            <option value="DEVICE_STATUS_CHANGE">DEVICE_STATUS_CHANGE</option>
            <option value="INCIDENT_UPDATE">INCIDENT_UPDATE</option>
            <option value="REPORT_EXPORT">REPORT_EXPORT</option>
          </select>
        </div>
      </div>

      {/* 3. Clean Swiss Audit Table */}
      <div className="bg-white border border-[#E5E7EB] rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-[#F9FAFB] border-b border-[#E5E7EB] text-[#6B7280] font-medium uppercase text-[11px] tracking-wider select-none">
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Actor</th>
                <th className="py-3 px-4">Action</th>
                <th className="py-3 px-4">Entity</th>
                <th className="py-3 px-4">IP Address</th>
                <th className="py-3 px-4">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F3F4F6]">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-8 text-center text-xs text-[#6B7280]">
                    No audit records match your query.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-[#F9FAFB] transition-swiss">
                    <td className="py-3 px-4 font-mono text-[#6B7280] text-[11px] whitespace-nowrap">
                      {log.timestamp}
                    </td>
                    <td className="py-3 px-4 font-medium text-[#171717]">
                      <div>{log.actor}</div>
                      <span className="text-[10px] text-[#9CA3AF] font-mono">{log.role}</span>
                    </td>
                    <td className="py-3 px-4 font-mono font-medium text-[#1677FF] text-[11px]">
                      {log.action}
                    </td>
                    <td className="py-3 px-4 font-mono text-[#171717] text-[11px]">
                      {log.entity_type || log.entityType || 'Asset'} ({log.entity_id || log.entityId || 'N/A'})
                    </td>
                    <td className="py-3 px-4 font-mono text-[#6B7280] text-[11px]">
                      {log.ip_address || log.ipAddress || '127.0.0.1'}
                    </td>
                    <td className="py-3 px-4 text-[#6B7280] max-w-xs truncate">
                      {typeof log.details === 'object' ? JSON.stringify(log.details) : log.details}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
