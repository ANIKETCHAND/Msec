import React from 'react';
import { useApp } from '../context/AppContext';
import StatusBadge from '../components/common/StatusBadge';
import {
  Server,
  ArrowLeft,
  Shield,
  ShieldCheck,
  ShieldAlert,
  Activity,
  Cpu,
  Lock,
  Battery,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Radio,
  Building2,
  SlidersHorizontal
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

  // Live 10-point telemetry stream
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
  const score = typeof device.securityScore === 'number' ? Math.round(device.securityScore) : 85;

  return (
    <div className="space-y-6">
      {/* 1. Header with Breadcrumb Back Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E5E7EB]">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setCurrentPage('devices')}
            className="p-1.5 rounded border border-[#E5E7EB] bg-white hover:bg-[#F9FAFB] text-[#6B7280] hover:text-[#171717] transition-swiss"
            title="Back to Device Inventory"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-semibold text-[#171717] tracking-tight">{device.name}</h1>
              <span className="font-mono text-xs px-2 py-0.5 rounded bg-[#E6F4FF] text-[#1677FF] border border-[#B5D8FE]">
                {device.id}
              </span>
            </div>
            <p className="text-xs text-[#6B7280] mt-0.5">
              {device.manufacturer || 'Medical IoMT'} {device.model ? `• ${device.model}` : ''} • {device.department || 'Clinical Unit'} • {device.location || device.patientRoom || 'Station 01'}
            </p>
          </div>
        </div>

        {/* Quarantine / Restore Action for Admin and Analysts */}
        {currentUser.role !== 'Doctor Demo' && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => toggleDeviceIsolation(device.id)}
              className={`
                px-3 py-1.5 rounded text-xs font-medium flex items-center gap-1.5 transition-swiss shadow-xs
                ${isIsolated
                  ? 'bg-[#10B981] hover:bg-emerald-600 text-white'
                  : 'bg-[#EF4444] hover:bg-rose-600 text-white'
                }
              `}
            >
              {isIsolated ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Restore to VLAN</span>
                </>
              ) : (
                <>
                  <ShieldAlert className="w-3.5 h-3.5" />
                  <span>Quarantine Port</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Safety Notice Banner */}
      <div className="p-3 bg-[#F9FAFB] border border-[#E5E7EB] rounded-lg flex flex-col md:flex-row md:items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2 text-[#171717]">
          <ShieldCheck className="w-4 h-4 text-[#10B981] shrink-0" />
          <span>
            <strong>AUTHORIZED SECURITY ASSESSMENT ONLY:</strong> Telemetry inspection and profile assessment restricted strictly to authorized IoMT scope.
          </span>
        </div>
        <span className="text-[10px] font-mono text-emerald-700 px-2 py-0.5 rounded bg-emerald-50 border border-emerald-200 w-max font-semibold flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
          LIVE TELEMETRY STREAM
        </span>
      </div>

      {/* 2. Key Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Security Posture Score */}
        <div className="bg-white border border-[#E5E7EB] p-4 rounded-lg space-y-1">
          <span className="text-xs text-[#6B7280] font-medium uppercase tracking-wider">
            Posture Score
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-mono font-bold text-[#171717] tabular-nums">
              {score}
            </span>
            <span className="text-xs text-[#6B7280]">/ 100</span>
          </div>
          <p className="text-[11px] text-[#6B7280]">
            Posture: <strong className={score >= 80 ? 'text-emerald-700' : score >= 60 ? 'text-amber-800' : 'text-rose-700'}>{score >= 80 ? 'Compliant' : score >= 60 ? 'Moderate Risk' : 'High Risk'}</strong>
          </p>
        </div>

        {/* Operational Status */}
        <div className="bg-white border border-[#E5E7EB] p-4 rounded-lg space-y-1">
          <span className="text-xs text-[#6B7280] font-medium uppercase tracking-wider">
            Operational Posture
          </span>
          <div className="pt-1">
            <StatusBadge status={isIsolated ? 'isolated' : device.status} />
          </div>
          <p className="text-[11px] text-[#6B7280]">Network: {device.networkSegment}</p>
        </div>

        {/* Risk Classification */}
        <div className="bg-white border border-[#E5E7EB] p-4 rounded-lg space-y-1">
          <span className="text-xs text-[#6B7280] font-medium uppercase tracking-wider">
            Risk Classification
          </span>
          <div className="pt-1">
            <StatusBadge status={device.riskLevel || 'low'} />
          </div>
          <p className="text-[11px] text-[#6B7280]">Criticality weight: {device.deviceType === 'Mechanical Ventilator' ? '1.5x' : '1.3x'}</p>
        </div>

        {/* IP & Telemetry Link */}
        <div className="bg-white border border-[#E5E7EB] p-4 rounded-lg space-y-1">
          <span className="text-xs text-[#6B7280] font-medium uppercase tracking-wider">
            IP Endpoint
          </span>
          <div className="text-base font-mono font-semibold text-[#171717] pt-1">
            {device.ipAddress}
          </div>
          <p className="text-[11px] text-[#6B7280] font-mono">MAC: {device.macAddress || '00:1A:2B:3C:4D:5E'}</p>
        </div>
      </div>

      {/* 3. Live Telemetry Stream Chart */}
      <div className="bg-white border border-[#E5E7EB] rounded-lg p-5 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[#F3F4F6]">
          <div>
            <h2 className="text-sm font-semibold text-[#171717]">
              Real-Time Telemetry Stream & Heuristics
            </h2>
            <p className="text-xs text-[#6B7280]">
              Continuous payload volume and clinical heartbeat latency (10-minute historical sample).
            </p>
          </div>
          <span className="text-xs font-mono text-[#10B981] flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse" />
            Live Ingest
          </span>
        </div>

        <div className="h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={telemetryHistory}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
              <XAxis dataKey="time" stroke="#9CA3AF" tick={{ fontSize: 11 }} />
              <YAxis stroke="#9CA3AF" tick={{ fontSize: 11 }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#FFFFFF',
                  borderColor: '#E5E7EB',
                  borderRadius: '6px',
                  fontSize: '12px'
                }}
              />
              <Line
                type="monotone"
                dataKey="val1"
                stroke="#1677FF"
                strokeWidth={2}
                dot={{ r: 3, fill: '#1677FF' }}
                name="Telemetry Flow (pkts/s)"
              />
              <Line
                type="monotone"
                dataKey="flow"
                stroke="#F59E0B"
                strokeWidth={1.5}
                dot={{ r: 2 }}
                name="Anomaly Heuristic Rate"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 4. Active Security Events on this Device */}
      <div className="bg-white border border-[#E5E7EB] rounded-lg p-5">
        <h2 className="text-sm font-semibold text-[#171717] pb-3 border-b border-[#F3F4F6]">
          Correlated Security Events ({deviceEvents.length})
        </h2>

        {deviceEvents.length === 0 ? (
          <p className="py-6 text-center text-xs text-[#6B7280]">
            No open security alerts detected for endpoint {device.id}.
          </p>
        ) : (
          <div className="divide-y divide-[#F3F4F6] mt-2">
            {deviceEvents.map((evt) => (
              <div key={evt.id} className="py-3 flex items-center justify-between text-xs">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-[#171717]">{evt.ruleName}</span>
                    <StatusBadge status={evt.severity} size="xs" />
                  </div>
                  <p className="text-[11px] text-[#6B7280] font-mono mt-0.5">{evt.timestamp} • {evt.suggestedAction}</p>
                </div>
                <span className="font-mono text-[#6B7280] text-[11px] uppercase">{evt.status}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
