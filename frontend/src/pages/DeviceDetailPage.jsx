import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  Server,
  ArrowLeft,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Activity,
  Cpu,
  Wifi,
  Radio,
  Lock,
  Battery,
  AlertTriangle,
  History,
  FileCheck2,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';

export default function DeviceDetailPage() {
  const {
    devices,
    selectedDeviceId,
    setCurrentPage,
    toggleDeviceIsolation,
    securityEvents,
    currentUser
  } = useApp();

  const device = devices.find(d => d.id === selectedDeviceId) || devices[0];
  const deviceEvents = securityEvents.filter(e => e.deviceId === device.id);

  // Simulated 10-point telemetry stream
  const telemetryHistory = [
    { time: '11:50', val1: 72, val2: 98, flow: 12 },
    { time: '11:51', val1: 73, val2: 98, flow: 14 },
    { time: '11:52', val1: 75, val2: 99, flow: 18 },
    { time: '11:53', val1: 74, val2: 98, flow: 15 },
    { time: '11:54', val1: 76, val2: 97, flow: 22 },
    { time: '11:55', val1: 78, val2: 98, flow: 45 },
    { time: '11:56', val1: 82, val2: 98, flow: 110 },
    { time: '11:57', val1: 80, val2: 99, flow: 95 },
    { time: '11:58', val1: 79, val2: 98, flow: 34 },
    { time: '11:59', val1: 77, val2: 98, flow: 16 }
  ];

  const isIsolated = device.status === 'isolated';

  return (
    <div className="space-y-6">
      {/* Back button & Page title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setCurrentPage('devices')}
            className="p-2 bg-navy-900 hover:bg-navy-800 border border-navy-700 rounded-xl text-slate-300 transition"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-white">{device.name}</h1>
              <span className="font-mono text-xs px-2 py-0.5 rounded bg-mediblue-500/20 text-mediblue-400 border border-mediblue-500/30">
                {device.id}
              </span>
            </div>
            <p className="text-xs text-slate-400">
              {device.deviceType} • {device.patientRoom} • {device.networkSegment}
            </p>
          </div>
        </div>

        {/* Isolation / Quarantine Control (Admins and Analysts only) */}
        {currentUser.role !== 'Doctor Demo' && (
          <div className="flex items-center gap-3">
            <button
              onClick={() => toggleDeviceIsolation(device.id)}
              className={`
                px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition shadow-md
                ${isIsolated
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                  : 'bg-medidanger-600 hover:bg-medidanger-500 text-white'
                }
              `}
            >
              {isIsolated ? (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  Restore to VLAN
                </>
              ) : (
                <>
                  <ShieldAlert className="w-4 h-4" />
                  Quarantine / Isolate Port
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Device Hardware & Network Status Card */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-navy-900 border border-navy-800 p-4 rounded-2xl space-y-1">
          <span className="text-[11px] text-slate-400">Operational Posture</span>
          <div className="text-lg font-bold text-white capitalize flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full ${isIsolated ? 'bg-purple-500' : device.status === 'online' ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
            {device.status}
          </div>
          <p className="text-[10px] text-slate-400">Risk Assessment: <span className="uppercase font-bold text-mediblue-400">{device.riskLevel}</span></p>
        </div>

        <div className="bg-navy-900 border border-navy-800 p-4 rounded-2xl space-y-1">
          <span className="text-[11px] text-slate-400">IP & MAC Addresses</span>
          <div className="text-sm font-mono font-bold text-white">{device.ipAddress}</div>
          <div className="text-[10px] font-mono text-slate-400">{device.macAddress}</div>
        </div>

        <div className="bg-navy-900 border border-navy-800 p-4 rounded-2xl space-y-1">
          <span className="text-[11px] text-slate-400">Firmware & Hardware</span>
          <div className="text-sm font-bold text-white">{device.firmwareVersion}</div>
          <div className="text-[10px] text-emerald-400 flex items-center gap-1">
            <Battery className="w-3 h-3" /> {device.batteryLevel}% Battery Level
          </div>
        </div>

        <div className="bg-navy-900 border border-navy-800 p-4 rounded-2xl space-y-1">
          <span className="text-[11px] text-slate-400">Network Segment (VLAN)</span>
          <div className="text-sm font-bold text-white">{device.networkSegment}</div>
          <div className="text-[10px] text-slate-400">Gateway: 192.168.10.1</div>
        </div>
      </div>

      {/* Live Telemetry Chart */}
      <div className="bg-navy-900 border border-navy-800 p-5 rounded-2xl space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-400" />
              Real-time Synthetic Physiological & Telemetry Stream
            </h2>
            <p className="text-[11px] text-slate-400">Continuous vital signal readings and inbound packet rate.</p>
          </div>
          <span className="text-[10px] font-mono px-2 py-1 bg-navy-950 text-slate-300 rounded border border-navy-800">
            Sampling: 1 Hz
          </span>
        </div>

        <div className="h-60 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={telemetryHistory} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="time" stroke="#64748b" tick={{ fontSize: 11 }} />
              <YAxis stroke="#64748b" tick={{ fontSize: 11 }} />
              <Tooltip
                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '0.75rem', fontSize: '11px' }}
              />
              <Line type="monotone" dataKey="val1" stroke="#10b981" strokeWidth={2} name="Heart Rate / Rate" dot={false} />
              <Line type="monotone" dataKey="val2" stroke="#0ea5e9" strokeWidth={2} name="SpO2 / Tidal" dot={false} />
              <Line type="monotone" dataKey="flow" stroke="#f59e0b" strokeWidth={1.5} name="Packet Flow (pkts/s)" dot={false} strokeDasharray="4 4" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Current Reading Snapshot */}
        <div className="p-3 bg-navy-950/80 rounded-xl border border-navy-800 flex items-center justify-between text-xs">
          <div className="flex items-center gap-4">
            <span className="text-slate-400">Latest Signal:</span>
            {device.telemetry && Object.entries(device.telemetry).map(([k, v]) => (
              <span key={k} className="text-slate-200">
                <span className="text-slate-400 capitalize">{k.replace(/([A-Z])/g, ' $1')}:</span> <strong className="text-mediblue-400">{String(v)}</strong>
              </span>
            ))}
          </div>
          <span className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" /> Signal Verified
          </span>
        </div>
      </div>

      {/* Security Alert History for this Device */}
      <div className="bg-navy-900 border border-navy-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="p-5 border-b border-navy-800 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <History className="w-4 h-4 text-amber-400" />
              Security Event History ({device.id})
            </h2>
            <p className="text-[11px] text-slate-400">Detection triggers recorded specifically for this medical asset.</p>
          </div>
          <span className="text-xs text-slate-400 font-mono">{deviceEvents.length} events logged</span>
        </div>

        <div className="overflow-x-auto">
          {deviceEvents.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">
              Zero security violations or threshold triggers recorded for this device.
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="bg-navy-950/60 text-slate-400 uppercase text-[10px] tracking-wider border-b border-navy-800">
                <tr>
                  <th className="py-3 px-4">Event ID</th>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Rule Triggered</th>
                  <th className="py-3 px-4">Severity</th>
                  <th className="py-3 px-4">Evidence Summary</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-navy-800 text-slate-300">
                {deviceEvents.map(evt => (
                  <tr key={evt.id} className="hover:bg-navy-800/40">
                    <td className="py-3 px-4 font-mono text-mediblue-400">{evt.id}</td>
                    <td className="py-3 px-4 text-slate-400">{evt.timestamp}</td>
                    <td className="py-3 px-4 font-medium text-white">{evt.ruleName}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-500/20 text-red-400 border border-red-500/30">
                        {evt.severity.toUpperCase()}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-400">
                      {JSON.stringify(evt.evidence)}
                    </td>
                    <td className="py-3 px-4 capitalize font-mono text-slate-300">
                      {evt.status}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
