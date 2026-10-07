import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Play,
  RotateCcw,
  SlidersHorizontal,
  Lock,
  Activity,
  Server,
  Zap,
  Info,
  Layers,
  ArrowRight
} from 'lucide-react';

export default function ResponseSimulatorPage() {
  const { devices, toggleDeviceIsolation, logAudit, currentUser } = useApp();

  const [selectedDeviceId, setSelectedDeviceId] = useState(devices[0]?.id || 'DEV-VENT-502');
  const [selectedAction, setSelectedAction] = useState('QUARANTINE_VLAN');
  const [executing, setExecuting] = useState(false);
  const [executionLog, setExecutionLog] = useState([]);
  const [successNotice, setSuccessNotice] = useState('');

  const targetDevice = devices.find(d => d.id === selectedDeviceId) || devices[0];

  const playbooks = [
    {
      id: 'QUARANTINE_VLAN',
      title: 'Quarantine Switch Port (VLAN 99 Microsegmentation)',
      impact: 'High Network Isolation',
      clinicalSafety: 'Vital physiological telemetry redirected to dedicated buffer; device management port isolated.',
      recommendedFor: 'Ransomware propagation, active unauthorized C2 command execution.'
    },
    {
      id: 'RATE_LIMIT_PORT',
      title: 'Enforce Ingress Rate-Limiting (Bandwidth Throttling)',
      impact: 'Moderate Traffic Control',
      clinicalSafety: 'Preserves essential vital sign broadcast packets while dropping flooding volumetric traffic.',
      recommendedFor: 'SYN flood attacks, telemetry stream DDoS spikes.'
    },
    {
      id: 'SESSION_REVOCATION',
      title: 'Invalidate Active Sessions & Rotate Ephemeral Keys',
      impact: 'Authentication Reset',
      clinicalSafety: 'Forces immediate re-authentication of management portal; no effect on physical device operation.',
      recommendedFor: 'Credential stuffing, repeated failed authentication anomalies.'
    },
    {
      id: 'FIREWALL_ACL_BLOCK',
      title: 'Apply Medical Gateway ACL (Block Attacking IP)',
      impact: 'Targeted Perimeter Filtering',
      clinicalSafety: 'Blocks inbound packets from malicious IP at border switch while maintaining local clinical connectivity.',
      recommendedFor: 'External reconnaissance, port scanning probes.'
    }
  ];

  const handleExecutePlaybook = () => {
    setExecuting(true);
    setSuccessNotice('');

    const playbook = playbooks.find(p => p.id === selectedAction);

    setTimeout(() => {
      // Execute simulated containment
      if (selectedAction === 'QUARANTINE_VLAN') {
        toggleDeviceIsolation(targetDevice.id);
      }

      logAudit(
        'INCIDENT_CONTAINMENT_SIMULATED',
        'Device',
        targetDevice.id,
        `Executed simulated playbook '${playbook.title}' on ${targetDevice.name} (${targetDevice.ipAddress}).`
      );

      const newLogEntry = {
        id: `ACT-${Date.now().toString().slice(-6)}`,
        time: new Date().toLocaleTimeString(),
        device: targetDevice.name,
        deviceId: targetDevice.id,
        action: playbook.title,
        status: 'SUCCESSFUL (SIMULATED)',
        operator: currentUser.email
      };

      setExecutionLog(prev => [newLogEntry, ...prev]);
      setSuccessNotice(`Playbook '${playbook.title}' executed successfully against simulated asset ${targetDevice.id}.`);
      setExecuting(false);
    }, 800);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-amber-400" />
              Defensive Incident Containment Simulator
            </h1>
            <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30">
              Interactive Playbook Sandbox
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Simulated network microsegmentation and incident mitigation workflows for medical IoT assets.
          </p>
        </div>
      </div>

      {/* Safety & Defensive Rules Banner */}
      <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-amber-500/20 rounded-xl text-amber-400 flex-shrink-0">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div className="text-slate-300">
            <strong className="text-amber-400 font-bold block">SIMULATION — NO REAL DEVICE CONTROL:</strong>
            All response actions operate strictly within our simulated sandbox environment. Automated device shutdown, medication modifications, or destructive hardware changes are strictly forbidden by platform defensive safety rules.
          </div>
        </div>
        <span className="px-3 py-1 bg-amber-500/20 text-amber-400 font-mono text-[10px] font-bold rounded-lg border border-amber-500/40 w-max whitespace-nowrap">
          PATIENT SAFETY FIRST
        </span>
      </div>

      {successNotice && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" /> {successNotice}
        </div>
      )}

      {/* Control Panel Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Target & Playbook Selection */}
        <div className="bg-navy-900 border border-navy-800 p-5 rounded-2xl space-y-4 shadow-xl">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-mediblue-400" />
            Containment Configuration
          </h2>

          <div className="space-y-3 text-xs">
            <div>
              <label className="text-slate-300 font-medium block mb-1">Target Simulated IoMT Device</label>
              <select
                value={selectedDeviceId}
                onChange={(e) => setSelectedDeviceId(e.target.value)}
                className="w-full bg-navy-950 border border-navy-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-mediblue-500"
              >
                {devices.map(d => (
                  <option key={d.id} value={d.id}>
                    {d.name} ({d.id}) - {d.status.toUpperCase()}
                  </option>
                ))}
              </select>
            </div>

            {targetDevice && (
              <div className="p-3 bg-navy-950 rounded-xl border border-navy-800 space-y-1 text-[11px]">
                <div className="text-slate-400">Current Status: <strong className={targetDevice.status === 'isolated' ? 'text-purple-400' : 'text-emerald-400'}>{targetDevice.status.toUpperCase()}</strong></div>
                <div className="text-slate-400">IP: <span className="font-mono text-mediblue-400">{targetDevice.ipAddress}</span></div>
                <div className="text-slate-400">Segment: <span className="font-mono text-slate-300">{targetDevice.networkSegment}</span></div>
              </div>
            )}

            <div>
              <label className="text-slate-300 font-medium block mb-1">Defensive Playbook Action</label>
              <select
                value={selectedAction}
                onChange={(e) => setSelectedAction(e.target.value)}
                className="w-full bg-navy-950 border border-navy-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-mediblue-500"
              >
                {playbooks.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.title}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={handleExecutePlaybook}
              disabled={executing}
              className="w-full py-2.5 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white font-semibold rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-amber-600/20 transition mt-2"
            >
              {executing ? (
                <>
                  <Activity className="w-4 h-4 animate-spin" />
                  Applying Network Microsegmentation...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-white" />
                  Trigger Simulated Containment
                </>
              )}
            </button>
          </div>
        </div>

        {/* Middle Column: Playbook Clinical Safety Details */}
        <div className="bg-navy-900 border border-navy-800 p-5 rounded-2xl space-y-4 shadow-xl">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            Clinical Safety & Operational Impact
          </h2>

          {(() => {
            const pb = playbooks.find(p => p.id === selectedAction) || playbooks[0];
            return (
              <div className="space-y-3 text-xs">
                <div className="p-3 bg-navy-950 rounded-xl border border-navy-800 space-y-1">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Playbook</span>
                  <div className="font-bold text-white text-sm">{pb.title}</div>
                </div>

                <div className="p-3 bg-navy-950 rounded-xl border border-navy-800 space-y-1">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Network Impact</span>
                  <div className="font-medium text-amber-400">{pb.impact}</div>
                </div>

                <div className="p-3 bg-navy-950 rounded-xl border border-navy-800 space-y-1">
                  <span className="text-[10px] text-emerald-400 uppercase tracking-wider block font-semibold">Patient Safety Guardrail</span>
                  <p className="text-slate-300 leading-relaxed text-[11px]">{pb.clinicalSafety}</p>
                </div>

                <div className="p-3 bg-navy-950 rounded-xl border border-navy-800 space-y-1">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Threat Context</span>
                  <p className="text-slate-400 text-[11px]">{pb.recommendedFor}</p>
                </div>
              </div>
            );
          })()}
        </div>

        {/* Right Column: Execution History Log */}
        <div className="bg-navy-900 border border-navy-800 p-5 rounded-2xl space-y-4 shadow-xl">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Activity className="w-4 h-4 text-purple-400" />
              Containment Actions Audit Log
            </h2>
            <span className="text-[10px] font-mono text-slate-400">{executionLog.length} actions</span>
          </div>

          <div className="space-y-2.5 max-h-80 overflow-y-auto text-xs">
            {executionLog.length === 0 ? (
              <div className="py-12 text-center text-slate-500">
                No simulated containment actions executed yet. Select a playbook to test.
              </div>
            ) : (
              executionLog.map(log => (
                <div key={log.id} className="p-3 bg-navy-950 rounded-xl border border-navy-800 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10px] text-mediblue-400">{log.id}</span>
                    <span className="text-[10px] text-slate-500">{log.time}</span>
                  </div>
                  <div className="font-semibold text-white truncate">{log.action}</div>
                  <div className="text-[11px] text-slate-400 flex items-center justify-between pt-1">
                    <span>Target: {log.deviceId}</span>
                    <span className="text-emerald-400 font-semibold">{log.status}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
