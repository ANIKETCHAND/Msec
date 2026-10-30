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
import StatusBadge from '../components/common/StatusBadge';

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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-200">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-semibold tracking-tight text-neutral-900">
              Response & Containment Simulator
            </h1>
            <span className="text-[11px] font-mono font-medium px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">
              Simulated Mitigation Sandbox
            </span>
          </div>
        </div>
      </div>

      {/* Defensive Safety Notice */}
      <div className="p-4 bg-amber-50/60 border border-amber-200 rounded-lg flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs text-neutral-800">
        <div className="flex items-start sm:items-center gap-3">
          <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5 sm:mt-0" />
          <div className="leading-relaxed">
            <strong className="font-semibold text-neutral-900">SIMULATION — NO REAL DEVICE CONTROL:</strong>
            {' '}All response actions operate strictly within our simulated sandbox environment. Automated device shutdown, medication modifications, or destructive hardware changes are strictly forbidden by platform defensive safety rules.
          </div>
        </div>
        <span className="px-2.5 py-1 bg-white text-neutral-700 font-mono text-[10px] font-semibold rounded border border-neutral-300 shrink-0">
          PATIENT SAFETY FIRST
        </span>
      </div>

      {successNotice && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> {successNotice}
        </div>
      )}

      {/* Control Panel Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Target & Playbook Selection */}
        <div className="bg-white border border-neutral-200 p-5 rounded-lg space-y-4">
          <h2 className="text-sm font-semibold text-neutral-900 flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-neutral-600" />
            Containment Configuration
          </h2>

          <div className="space-y-3.5 text-xs">
            <div>
              <label className="text-neutral-700 font-medium block mb-1.5">Target Simulated Device</label>
              <select
                value={selectedDeviceId}
                onChange={(e) => setSelectedDeviceId(e.target.value)}
                className="w-full bg-white border border-neutral-300 rounded px-3 py-2 text-neutral-900 focus:outline-none focus:border-neutral-500 text-xs"
              >
                {devices.map(d => (
                  <option key={d.id} value={d.id}>
                    {d.name} ({d.id}) - {d.status.toUpperCase()}
                  </option>
                ))}
              </select>
            </div>

            {targetDevice && (
              <div className="p-3 bg-neutral-50 rounded border border-neutral-200 space-y-1.5 text-[11px]">
                <div className="flex justify-between items-center text-neutral-600">
                  <span>Current State:</span>
                  <StatusBadge status={targetDevice.status} />
                </div>
                <div className="flex justify-between items-center text-neutral-600">
                  <span>IP Address:</span>
                  <span className="font-mono text-neutral-900 font-medium">{targetDevice.ipAddress}</span>
                </div>
                <div className="flex justify-between items-center text-neutral-600">
                  <span>VLAN Segment:</span>
                  <span className="font-mono text-neutral-700">{targetDevice.networkSegment}</span>
                </div>
              </div>
            )}

            <div>
              <label className="text-neutral-700 font-medium block mb-1.5">Defensive Playbook Action</label>
              <select
                value={selectedAction}
                onChange={(e) => setSelectedAction(e.target.value)}
                className="w-full bg-white border border-neutral-300 rounded px-3 py-2 text-neutral-900 focus:outline-none focus:border-neutral-500 text-xs"
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
              className="w-full py-2 bg-neutral-900 hover:bg-black disabled:opacity-50 text-white font-medium rounded text-xs flex items-center justify-center gap-2 transition-swiss mt-2"
            >
              {executing ? (
                <>
                  <Activity className="w-3.5 h-3.5 animate-spin" />
                  Applying Network Microsegmentation...
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-white" />
                  Trigger Simulated Containment
                </>
              )}
            </button>
          </div>
        </div>

        {/* Middle Column: Playbook Clinical Safety Details */}
        <div className="bg-white border border-neutral-200 p-5 rounded-lg space-y-4">
          <h2 className="text-sm font-semibold text-neutral-900 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            Clinical Safety & Operational Impact
          </h2>

          {(() => {
            const pb = playbooks.find(p => p.id === selectedAction) || playbooks[0];
            return (
              <div className="space-y-3 text-xs">
                <div className="p-3 bg-neutral-50 rounded border border-neutral-200 space-y-1">
                  <span className="text-[10px] text-neutral-500 uppercase font-mono tracking-wider block">Selected Playbook</span>
                  <div className="font-semibold text-neutral-900 text-xs">{pb.title}</div>
                </div>

                <div className="p-3 bg-neutral-50 rounded border border-neutral-200 space-y-1">
                  <span className="text-[10px] text-neutral-500 uppercase font-mono tracking-wider block">Network Impact</span>
                  <div className="font-medium text-amber-700 text-xs">{pb.impact}</div>
                </div>

                <div className="p-3 bg-neutral-50 rounded border border-neutral-200 space-y-1">
                  <span className="text-[10px] text-emerald-700 uppercase font-mono tracking-wider block font-semibold">Patient Safety Guardrail</span>
                  <p className="text-neutral-700 leading-relaxed text-[11px]">{pb.clinicalSafety}</p>
                </div>

                <div className="p-3 bg-neutral-50 rounded border border-neutral-200 space-y-1">
                  <span className="text-[10px] text-neutral-500 uppercase font-mono tracking-wider block">Threat Context</span>
                  <p className="text-neutral-600 text-[11px]">{pb.recommendedFor}</p>
                </div>
              </div>
            );
          })()}
        </div>

        {/* Right Column: Execution History Log */}
        <div className="bg-white border border-neutral-200 p-5 rounded-lg space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-neutral-900 flex items-center gap-2">
                <Activity className="w-4 h-4 text-neutral-600" />
                Containment Action Ledger
              </h2>
              <span className="text-[11px] font-mono text-neutral-500">{executionLog.length} actions</span>
            </div>

            <div className="space-y-2.5 max-h-80 overflow-y-auto text-xs pr-1">
              {executionLog.length === 0 ? (
                <div className="py-14 text-center text-neutral-400">
                  No simulated containment actions executed yet.
                </div>
              ) : (
                executionLog.map(log => (
                  <div key={log.id} className="p-3 bg-neutral-50 rounded border border-neutral-200 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[11px] text-neutral-900 font-medium">{log.id}</span>
                      <span className="text-[10px] font-mono text-neutral-400">{log.time}</span>
                    </div>
                    <div className="font-medium text-neutral-900 text-xs truncate">{log.action}</div>
                    <div className="text-[11px] text-neutral-500 flex items-center justify-between pt-1">
                      <span>Target: {log.deviceId}</span>
                      <span className="text-emerald-700 font-semibold">{log.status}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
