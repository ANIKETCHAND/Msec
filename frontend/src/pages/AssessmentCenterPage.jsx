import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';
import {
  Shield,
  ShieldCheck,
  ShieldAlert,
  Play,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Cpu,
  Layers,
  Activity,
  FileText,
  Search,
  RefreshCw,
  Plus,
  X,
  ChevronRight,
  Info
} from 'lucide-react';

export default function AssessmentCenterPage() {
  const { devices, currentUser } = useApp();

  const [scopes, setScopes] = useState([]);
  const [assessments, setAssessments] = useState([]);
  const [selectedAssessment, setSelectedAssessment] = useState(null);
  const [loading, setLoading] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Scope creation modal
  const [scopeModalOpen, setScopeModalOpen] = useState(false);
  const [selectedDeviceId, setSelectedDeviceId] = useState(devices[0]?.id || 'DEV-ECG-001');
  const [selectedProfile, setSelectedProfile] = useState('DEFENSIVE_AUDIT');
  const [selectedTools, setSelectedTools] = useState(['nmap', 'nuclei']);
  const [justification, setJustification] = useState('Quarterly biomedical network compliance audit');
  const [durationHours, setDurationHours] = useState(4);

  // Assessment run selection
  const [activeScopeId, setActiveScopeId] = useState('');

  const targetDevice = devices.find(d => d.id === selectedDeviceId) || devices[0];

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const [fetchedScopes, fetchedAsms] = await Promise.all([
        api.getScopes().catch(() => []),
        api.getAssessments().catch(() => [])
      ]);
      setScopes(fetchedScopes || []);
      setAssessments(fetchedAsms || []);
      if (fetchedAsms && fetchedAsms.length > 0) {
        setSelectedAssessment(fetchedAsms[0]);
      }
      const active = fetchedScopes.find(s => s.authorization_status === 'AUTHORIZED');
      if (active) {
        setActiveScopeId(active.id);
      }
    } catch (err) {
      setErrorMsg('Failed to load assessment data.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateScope = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const newScope = await api.authorizeScope({
        device_id: selectedDeviceId,
        target_ip: targetDevice.ipAddress,
        assessment_profile: selectedProfile,
        selected_tools: selectedTools,
        duration_hours: Number(durationHours),
        justification: justification
      });
      setSuccessMsg(`Scope certificate ${newScope.id} successfully authorized!`);
      setScopeModalOpen(false);
      setActiveScopeId(newScope.id);
      loadData();
    } catch (err) {
      setErrorMsg(err.message || 'Scope authorization failed.');
    }
  };

  const handleRevokeScope = async (scopeId) => {
    try {
      await api.revokeScope(scopeId);
      setSuccessMsg(`Scope ${scopeId} revoked.`);
      loadData();
    } catch (err) {
      setErrorMsg(err.message || 'Failed to revoke scope.');
    }
  };

  const handleExecuteAssessment = async () => {
    if (!activeScopeId) {
      setErrorMsg('Please select an authorized scope certificate first.');
      return;
    }
    const currentScope = scopes.find(s => s.id === activeScopeId);
    if (!currentScope) {
      setErrorMsg('Selected scope is invalid or expired.');
      return;
    }

    setExecuting(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const result = await api.executeAssessment({
        scope_id: activeScopeId,
        device_id: currentScope.device_id,
        profile: currentScope.assessment_profile,
        tools: currentScope.selected_tools
      });
      setSelectedAssessment(result);
      setSuccessMsg(`Defensive assessment completed! Score: ${result.security_score}/100.`);
      loadData();
    } catch (err) {
      setErrorMsg(err.message || 'Assessment execution failed.');
    } finally {
      setExecuting(false);
    }
  };

  const toggleTool = (tool) => {
    setSelectedTools(prev =>
      prev.includes(tool) ? prev.filter(t => t !== tool) : [...prev, tool]
    );
  };

  const getSeverityBadge = (sev) => {
    switch (sev?.toUpperCase()) {
      case 'CRITICAL':
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'HIGH':
        return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
      case 'MEDIUM':
        return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
      case 'LOW':
        return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
      default:
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              <Shield className="w-5 h-5 text-mediblue-400" />
              Security Assessment Operations Center
            </h1>
            <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-mediblue-500/10 text-mediblue-400 border border-mediblue-500/30">
              Orchestrator v2.0
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Authorized multi-tool vulnerability diagnostics, bounded scopes, and clinical posture scoring.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setScopeModalOpen(true)}
            className="px-3.5 py-2 bg-mediblue-600 hover:bg-mediblue-500 text-white rounded-xl text-xs font-semibold flex items-center gap-2 transition shadow-lg shadow-mediblue-600/20"
          >
            <Plus className="w-4 h-4" />
            Authorize New Scope
          </button>
        </div>
      </div>

      {/* Defensive Safety Banner */}
      <div className="p-3 bg-navy-900/90 border border-navy-700/80 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2 text-slate-300">
          <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <span>
            <strong className="text-emerald-400">AUTHORIZED SECURITY ASSESSMENT ONLY:</strong> Assessments are restricted exclusively to registered IoMT assets within signed authorization scopes.
          </span>
        </div>
        <span className="text-[10px] font-mono text-amber-400/90 px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/30 w-max font-semibold">
          SIMULATION — NO REAL DEVICE CONTROL
        </span>
      </div>

      {/* Notifications */}
      {errorMsg && (
        <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" /> {errorMsg}
        </div>
      )}
      {successMsg && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" /> {successMsg}
        </div>
      )}

      {/* Active Scope & Launch Pad */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Scope Selector & Launcher */}
        <div className="bg-navy-900 border border-navy-800 p-5 rounded-2xl space-y-4 shadow-xl">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <Play className="w-4 h-4 text-emerald-400" />
            Launch Authorized Diagnostic Run
          </h2>

          <div className="space-y-3 text-xs">
            <div>
              <label className="text-slate-400 font-medium block mb-1">Select Active Scope Certificate</label>
              <select
                value={activeScopeId}
                onChange={(e) => setActiveScopeId(e.target.value)}
                className="w-full bg-navy-950 border border-navy-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-mediblue-500"
              >
                <option value="">-- Choose Scope --</option>
                {scopes.filter(s => s.authorization_status === 'AUTHORIZED').map(s => (
                  <option key={s.id} value={s.id}>
                    {s.id} • {s.device_id} ({s.target_ip})
                  </option>
                ))}
              </select>
            </div>

            {activeScopeId && (() => {
              const sc = scopes.find(s => s.id === activeScopeId);
              if (!sc) return null;
              return (
                <div className="p-3 bg-navy-950 rounded-xl border border-navy-800 space-y-1.5 text-[11px]">
                  <div className="text-slate-400">Target: <strong className="text-white">{sc.device_id}</strong></div>
                  <div className="text-slate-400">Target IP: <strong className="text-mediblue-400 font-mono">{sc.target_ip}</strong></div>
                  <div className="text-slate-400">Profile: <strong className="text-slate-200">{sc.assessment_profile}</strong></div>
                  <div className="text-slate-400">Tools: <span className="text-emerald-400 font-mono">{sc.selected_tools.join(', ')}</span></div>
                  <div className="text-slate-400">Expires: <span className="text-amber-400 font-mono">{new Date(sc.expires_at).toLocaleTimeString()}</span></div>
                </div>
              );
            })()}

            <button
              onClick={handleExecuteAssessment}
              disabled={executing || !activeScopeId}
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 transition"
            >
              {executing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Orchestrating Defensive Assessment...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-white" />
                  Execute Assessment Now
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right 2 Columns: Active Scopes Registry */}
        <div className="lg:col-span-2 bg-navy-900 border border-navy-800 p-5 rounded-2xl space-y-4 shadow-xl">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-mediblue-400" />
              Authorization Scope Certificates Registry
            </h2>
            <span className="text-xs text-slate-400 font-mono">{scopes.length} scopes registered</span>
          </div>

          <div className="overflow-x-auto max-h-56">
            <table className="w-full text-left text-xs">
              <thead className="bg-navy-950/70 text-slate-400 uppercase text-[10px] tracking-wider border-b border-navy-800">
                <tr>
                  <th className="py-2.5 px-3">Scope ID</th>
                  <th className="py-2.5 px-3">Device / IP</th>
                  <th className="py-2.5 px-3">Profile</th>
                  <th className="py-2.5 px-3">Tools</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-navy-800/70 text-slate-300">
                {scopes.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="py-6 text-center text-slate-400">
                      No authorization scopes active. Click "Authorize New Scope" above.
                    </td>
                  </tr>
                ) : (
                  scopes.map(sc => (
                    <tr key={sc.id} className="hover:bg-navy-800/30">
                      <td className="py-2.5 px-3 font-mono text-mediblue-400 font-medium">{sc.id}</td>
                      <td className="py-2.5 px-3">
                        <div className="font-semibold text-white">{sc.device_id}</div>
                        <div className="text-[10px] font-mono text-slate-400">{sc.target_ip}</div>
                      </td>
                      <td className="py-2.5 px-3 text-[11px]">{sc.assessment_profile}</td>
                      <td className="py-2.5 px-3 font-mono text-[10px] text-emerald-400">{sc.selected_tools.join(', ')}</td>
                      <td className="py-2.5 px-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${
                          sc.authorization_status === 'AUTHORIZED'
                            ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                            : 'bg-red-500/20 text-red-400 border-red-500/30'
                        }`}>
                          {sc.authorization_status}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        {sc.authorization_status === 'AUTHORIZED' && (
                          <button
                            onClick={() => handleRevokeScope(sc.id)}
                            className="px-2 py-1 bg-navy-800 hover:bg-red-500/20 hover:text-red-400 text-slate-400 rounded text-[10px] transition"
                          >
                            Revoke
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Assessment Findings & Details View */}
      {selectedAssessment && (
        <div className="bg-navy-900 border border-navy-800 rounded-2xl overflow-hidden shadow-2xl space-y-4 p-5">
          {/* Summary Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-navy-800 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white">
                  Assessment Findings: {selectedAssessment.device_id}
                </h2>
                <span className="font-mono text-xs px-2 py-0.5 rounded bg-mediblue-500/20 text-mediblue-400 border border-mediblue-500/30">
                  {selectedAssessment.id}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                {selectedAssessment.summary || 'Normalized findings from multi-tool diagnostic scan.'}
              </p>
            </div>

            {/* Score Ring */}
            <div className="flex items-center gap-4 bg-navy-950 p-3 rounded-xl border border-navy-800">
              <div className="text-right">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Security Posture</span>
                <span className={`text-xl font-mono font-bold ${
                  selectedAssessment.security_score >= 80 ? 'text-emerald-400' :
                  selectedAssessment.security_score >= 60 ? 'text-amber-400' : 'text-red-400'
                }`}>
                  {selectedAssessment.security_score}/100
                </span>
              </div>
              <div className="h-8 w-px bg-navy-800"></div>
              <div className="text-xs space-y-0.5">
                <div className="text-[10px] text-slate-400">Total Findings: <strong className="text-white">{selectedAssessment.total_findings}</strong></div>
                <div className="text-[10px] text-red-400 font-semibold">Critical / High: {selectedAssessment.critical_findings + selectedAssessment.high_findings}</div>
              </div>
            </div>
          </div>

          {/* Findings Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-navy-950/70 text-slate-400 uppercase text-[10px] tracking-wider border-b border-navy-800">
                <tr>
                  <th className="py-3 px-4">Severity</th>
                  <th className="py-3 px-4">Finding & Description</th>
                  <th className="py-3 px-4">Port / Service</th>
                  <th className="py-3 px-4">Source Tool</th>
                  <th className="py-3 px-4">Remediation Guidance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-navy-800 text-slate-300">
                {!selectedAssessment.findings || selectedAssessment.findings.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="py-8 text-center text-slate-400">
                      No security vulnerabilities or misconfigurations detected for this device.
                    </td>
                  </tr>
                ) : (
                  selectedAssessment.findings.map(f => (
                    <tr key={f.id} className="hover:bg-navy-800/30">
                      <td className="py-3 px-4">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${getSeverityBadge(f.severity)}`}>
                          {f.severity.toUpperCase()}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-white">{f.title}</div>
                        <div className="text-[11px] text-slate-400 mt-0.5">{f.description}</div>
                        {f.cve_id && (
                          <div className="mt-1 flex items-center gap-2">
                            <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-red-500/10 text-red-400 border border-red-500/20">
                              {f.cve_id} (CVSS {f.cvss_score})
                            </span>
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-300">
                        {f.affected_port ? `${f.affected_port}/${f.affected_service || 'tcp'}` : 'N/A'}
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px] text-mediblue-400 uppercase">
                        {f.source_tool}
                      </td>
                      <td className="py-3 px-4 text-emerald-400 text-[11px]">
                        {f.remediation_guidance || 'Follow vendor hardening guidelines.'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Authorize Scope Modal */}
      {scopeModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-navy-900 border border-navy-700 rounded-2xl w-full max-w-lg p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-navy-800 pb-3">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-mediblue-400" />
                Authorize Defensive Security Scope Certificate
              </h2>
              <button onClick={() => setScopeModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateScope} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="text-slate-300 font-medium">Target IoMT Device</label>
                <select
                  value={selectedDeviceId}
                  onChange={(e) => setSelectedDeviceId(e.target.value)}
                  className="w-full bg-navy-950 border border-navy-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-mediblue-500"
                >
                  {devices.map(d => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.id} - {d.ipAddress})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-300 font-medium">Target IP (Strict Whitelist)</label>
                  <input
                    type="text"
                    disabled
                    value={targetDevice.ipAddress}
                    className="w-full bg-navy-950/60 border border-navy-800 rounded-xl px-3 py-2 text-slate-400 font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-300 font-medium">Duration (Hours)</label>
                  <input
                    type="number"
                    min="1"
                    max="24"
                    value={durationHours}
                    onChange={(e) => setDurationHours(e.target.value)}
                    className="w-full bg-navy-950 border border-navy-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-mediblue-500"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-slate-300 font-medium">Assessment Profile</label>
                <select
                  value={selectedProfile}
                  onChange={(e) => setSelectedProfile(e.target.value)}
                  className="w-full bg-navy-950 border border-navy-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-mediblue-500"
                >
                  <option value="DEFENSIVE_AUDIT">DEFENSIVE_AUDIT (Ports, Services & Posture)</option>
                  <option value="PASSIVE_DISCOVERY">PASSIVE_DISCOVERY (Informational Only)</option>
                  <option value="COMPLIANCE_SCAN">COMPLIANCE_SCAN (IoMT Clinical Standards)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-slate-300 font-medium block">Approved Defensive Tools</label>
                <div className="grid grid-cols-3 gap-2">
                  {['nmap', 'nuclei', 'zap', 'nikto', 'openvas'].map(t => (
                    <label
                      key={t}
                      className={`p-2 rounded-xl border flex items-center gap-2 cursor-pointer transition ${
                        selectedTools.includes(t)
                          ? 'bg-mediblue-600/20 border-mediblue-500/50 text-white font-semibold'
                          : 'bg-navy-950 border-navy-800 text-slate-400'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedTools.includes(t)}
                        onChange={() => toggleTool(t)}
                        className="rounded"
                      />
                      <span className="capitalize">{t}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-slate-300 font-medium">Audited Justification</label>
                <textarea
                  value={justification}
                  onChange={(e) => setJustification(e.target.value)}
                  rows="2"
                  className="w-full bg-navy-950 border border-navy-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-mediblue-500"
                  required
                />
              </div>

              <div className="pt-3 border-t border-navy-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setScopeModalOpen(false)}
                  className="px-3.5 py-1.5 bg-navy-800 text-slate-300 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-mediblue-600 hover:bg-mediblue-500 text-white font-semibold rounded-xl"
                >
                  Sign & Authorize Scope
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
