import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import MetricCard from '../components/common/MetricCard';
import StatusBadge from '../components/common/StatusBadge';
import {
  Server,
  AlertTriangle,
  FileText,
  ShieldCheck,
  Shield,
  ArrowRight,
  ChevronRight,
  ChevronDown,
  Activity,
  Layers,
  ExternalLink,
  Lock,
  Cpu
} from 'lucide-react';

export default function DashboardPage() {
  const {
    devices,
    securityEvents,
    incidents,
    integrityRecords,
    setCurrentPage,
    setSelectedDeviceId
  } = useApp();

  const [secondaryExpanded, setSecondaryExpanded] = useState(false);

  // 1. Core Primary Metrics calculation (using actual backend data)
  const totalDevices = devices.length;
  const onlineDevices = devices.filter(d => d.status === 'online').length;
  const offlineDevices = devices.filter(d => d.status === 'offline').length;
  const suspiciousDevices = devices.filter(d => d.status === 'suspicious' || d.status === 'isolated').length;

  const activeAlerts = securityEvents.filter(e => e.status === 'open' || e.status === 'investigating').length;
  const criticalIncidents = incidents.filter(i => i.severity === 'critical' && i.status !== 'closed').length;

  const tamperedRecords = integrityRecords.filter(r => r.status === 'tampered').length;
  const integrityStatus = tamperedRecords === 0 ? 'Verified' : `${tamperedRecords} Drift Detected`;

  // Institutional posture calculation
  const avgPostureScore = totalDevices > 0
    ? Math.round(devices.reduce((acc, d) => acc + (d.securityScore ?? 85), 0) / totalDevices)
    : 85;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="border-b border-[#E5E7EB] pb-5">
        <h1 className="text-xl sm:text-2xl font-semibold text-[#171717] tracking-tight">
          IoMT Security Operations Center
        </h1>
        <p className="text-xs text-[#6B7280] mt-1">
          Monitor connected medical devices, security events, and vulnerabilities.
        </p>
      </div>

      {/* 2. FOUR PRIMARY SUMMARY METRICS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Monitored Devices"
          value={totalDevices}
          secondary={`${onlineDevices} online in clinical VLANs`}
          icon={Server}
          onClick={() => setCurrentPage('devices')}
        />
        <MetricCard
          title="Active Security Alerts"
          value={activeAlerts}
          secondary={`${securityEvents.filter(e => e.severity === 'critical').length} critical alerts`}
          icon={AlertTriangle}
          onClick={() => setCurrentPage('security-events')}
        />
        <MetricCard
          title="Critical Incidents"
          value={criticalIncidents}
          secondary={criticalIncidents === 0 ? 'No open breaches' : 'Immediate review needed'}
          icon={FileText}
          onClick={() => setCurrentPage('incidents')}
        />
        <MetricCard
          title="Data Integrity Status"
          value={integrityStatus}
          secondary="SHA-256 hash-chain verified"
          icon={ShieldCheck}
          onClick={() => setCurrentPage('integrity')}
        />
      </div>

      {/* 3. FOUR CAREFULLY ALIGNED SECTIONS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Security Posture & Device Status Distribution (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Section 1: Security Posture */}
          <div className="bg-white border border-[#E5E7EB] rounded-lg p-5">
            <div className="flex items-center justify-between pb-3 border-b border-[#F3F4F6]">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#6B7280]">
                Security Posture
              </span>
              <span className="text-xs font-mono font-medium text-[#1677FF]">
                Target: &gt;80.0
              </span>
            </div>

            <div className="mt-4 flex items-baseline justify-between">
              <div>
                <span className="text-3xl font-semibold text-[#171717] tracking-tight tabular-nums">
                  {avgPostureScore}
                </span>
                <span className="text-xs text-[#6B7280] ml-1">/ 100</span>
              </div>
              <StatusBadge status={avgPostureScore >= 80 ? 'safe' : avgPostureScore >= 60 ? 'warning' : 'critical'} />
            </div>

            {/* Posture Progress Bar */}
            <div className="mt-3 w-full bg-[#F3F4F6] rounded-full h-2 overflow-hidden">
              <div
                className={`h-full rounded-full transition-swiss ${
                  avgPostureScore >= 80 ? 'bg-[#10B981]' : avgPostureScore >= 60 ? 'bg-[#F59E0B]' : 'bg-[#EF4444]'
                }`}
                style={{ width: `${avgPostureScore}%` }}
              />
            </div>

            <p className="text-[11px] text-[#6B7280] mt-3 leading-relaxed">
              Institutional score calculated across {totalDevices} medical endpoints factoring clinical device criticality (Ventilator 1.5x) and network isolation.
            </p>

            <button
              onClick={() => setCurrentPage('assessment-center')}
              className="mt-4 w-full py-2 px-3 rounded border border-[#E5E7EB] hover:bg-[#F9FAFB] text-xs font-medium text-[#171717] flex items-center justify-center gap-1.5 transition-swiss"
            >
              <span>Execute Assessment Scope</span>
              <ArrowRight className="w-3.5 h-3.5 text-[#6B7280]" />
            </button>
          </div>

          {/* Section 2: Device Status Distribution */}
          <div className="bg-white border border-[#E5E7EB] rounded-lg p-5">
            <div className="flex items-center justify-between pb-3 border-b border-[#F3F4F6]">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#6B7280]">
                Device Status Distribution
              </span>
              <button
                onClick={() => setCurrentPage('devices')}
                className="text-xs text-[#1677FF] hover:underline flex items-center gap-0.5"
              >
                <span>View Inventory</span>
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>

            <div className="mt-4 space-y-3">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-[#171717] font-medium flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#10B981]" /> Online & Monitored
                  </span>
                  <span className="font-mono text-[#6B7280] tabular-nums">
                    {onlineDevices} ({Math.round((onlineDevices / (totalDevices || 1)) * 100)}%)
                  </span>
                </div>
                <div className="w-full bg-[#F3F4F6] rounded-full h-1.5 overflow-hidden">
                  <div className="bg-[#10B981] h-full" style={{ width: `${(onlineDevices / (totalDevices || 1)) * 100}%` }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-[#171717] font-medium flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#F59E0B]" /> Suspicious / Isolated
                  </span>
                  <span className="font-mono text-[#6B7280] tabular-nums">
                    {suspiciousDevices} ({Math.round((suspiciousDevices / (totalDevices || 1)) * 100)}%)
                  </span>
                </div>
                <div className="w-full bg-[#F3F4F6] rounded-full h-1.5 overflow-hidden">
                  <div className="bg-[#F59E0B] h-full" style={{ width: `${(suspiciousDevices / (totalDevices || 1)) * 100}%` }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-[#171717] font-medium flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#EF4444]" /> Offline
                  </span>
                  <span className="font-mono text-[#6B7280] tabular-nums">
                    {offlineDevices} ({Math.round((offlineDevices / (totalDevices || 1)) * 100)}%)
                  </span>
                </div>
                <div className="w-full bg-[#F3F4F6] rounded-full h-1.5 overflow-hidden">
                  <div className="bg-[#EF4444] h-full" style={{ width: `${(offlineDevices / (totalDevices || 1)) * 100}%` }} />
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* Right Column: Recent Events & Incidents (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Section 3: Recent Security Events */}
          <div className="bg-white border border-[#E5E7EB] rounded-lg p-5">
            <div className="flex items-center justify-between pb-3 border-b border-[#F3F4F6]">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#6B7280]">
                Recent Security Events
              </span>
              <button
                onClick={() => setCurrentPage('security-events')}
                className="text-xs text-[#1677FF] hover:underline flex items-center gap-0.5"
              >
                <span>All Events ({securityEvents.length})</span>
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>

            <div className="mt-2 divide-y divide-[#F3F4F6]">
              {securityEvents.slice(0, 4).map((evt) => (
                <div
                  key={evt.id}
                  onClick={() => setCurrentPage('security-events')}
                  className="py-3 flex items-center justify-between gap-3 hover:bg-[#F9FAFB] px-2 rounded cursor-pointer transition-swiss"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-semibold text-[#171717] truncate">{evt.ruleName}</p>
                      <StatusBadge status={evt.severity} size="xs" />
                    </div>
                    <p className="text-[11px] text-[#6B7280] font-mono mt-0.5 truncate">
                      Target: {evt.deviceId} • {evt.timestamp}
                    </p>
                  </div>
                  <span className="text-xs text-[#6B7280] font-mono shrink-0 capitalize">{evt.status}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Section 4: Recent Incidents */}
          <div className="bg-white border border-[#E5E7EB] rounded-lg p-5">
            <div className="flex items-center justify-between pb-3 border-b border-[#F3F4F6]">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#6B7280]">
                Recent Incident Tickets
              </span>
              <button
                onClick={() => setCurrentPage('incidents')}
                className="text-xs text-[#1677FF] hover:underline flex items-center gap-0.5"
              >
                <span>Incident Queue ({incidents.length})</span>
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>

            <div className="mt-2 divide-y divide-[#F3F4F6]">
              {incidents.slice(0, 3).map((inc) => (
                <div
                  key={inc.id}
                  onClick={() => setCurrentPage('incidents')}
                  className="py-3 flex items-center justify-between gap-3 hover:bg-[#F9FAFB] px-2 rounded cursor-pointer transition-swiss"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-mono text-[#6B7280]">{inc.id}</span>
                      <p className="text-xs font-semibold text-[#171717] truncate">{inc.title}</p>
                    </div>
                    <p className="text-[11px] text-[#6B7280] mt-0.5 truncate">
                      Assigned: {inc.assignedTo} • Device: {inc.deviceId}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <StatusBadge status={inc.severity} size="xs" />
                    <span className="text-xs text-[#6B7280] font-mono uppercase">{inc.status}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>

      {/* 4. SECONDARY INFORMATION EXPANDABLE SECTION */}
      <div className="border border-[#E5E7EB] rounded-lg bg-white overflow-hidden">
        <button
          onClick={() => setSecondaryExpanded(!secondaryExpanded)}
          className="w-full px-5 py-3.5 bg-[#F9FAFB] hover:bg-[#F3F4F6] text-xs font-medium text-[#171717] flex items-center justify-between transition-swiss select-none"
        >
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-[#6B7280]" />
            <span>Secondary Telemetry & Governance Workspaces</span>
          </div>
          <ChevronDown className={`w-4 h-4 text-[#6B7280] transition-swiss ${secondaryExpanded ? 'rotate-180' : ''}`} />
        </button>

        {secondaryExpanded && (
          <div className="p-5 border-t border-[#E5E7EB] grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-fadeIn">
            <div
              onClick={() => setCurrentPage('topology')}
              className="p-3.5 rounded border border-[#E5E7EB] hover:border-[#1677FF] hover:bg-[#F9FAFB] cursor-pointer transition-swiss"
            >
              <div className="flex items-center justify-between text-xs font-semibold text-[#171717]">
                <span>Network Topology</span>
                <ExternalLink className="w-3.5 h-3.5 text-[#9CA3AF]" />
              </div>
              <p className="text-[11px] text-[#6B7280] mt-1">Clinical VLAN segmentation viewer (ICU, Ward, ER)</p>
            </div>

            <div
              onClick={() => setCurrentPage('ml-detection')}
              className="p-3.5 rounded border border-[#E5E7EB] hover:border-[#1677FF] hover:bg-[#F9FAFB] cursor-pointer transition-swiss"
            >
              <div className="flex items-center justify-between text-xs font-semibold text-[#171717]">
                <span>ML Threat Analytics</span>
                <ExternalLink className="w-3.5 h-3.5 text-[#9CA3AF]" />
              </div>
              <p className="text-[11px] text-[#6B7280] mt-1">CICIoMT2024 Random Forest inference metrics</p>
            </div>

            <div
              onClick={() => setCurrentPage('audit-logs')}
              className="p-3.5 rounded border border-[#E5E7EB] hover:border-[#1677FF] hover:bg-[#F9FAFB] cursor-pointer transition-swiss"
            >
              <div className="flex items-center justify-between text-xs font-semibold text-[#171717]">
                <span>Cryptographic Audit Chain</span>
                <ExternalLink className="w-3.5 h-3.5 text-[#9CA3AF]" />
              </div>
              <p className="text-[11px] text-[#6B7280] mt-1">SHA-256 tamper-evident integrity validator</p>
            </div>

            <div
              onClick={() => setCurrentPage('reports')}
              className="p-3.5 rounded border border-[#E5E7EB] hover:border-[#1677FF] hover:bg-[#F9FAFB] cursor-pointer transition-swiss"
            >
              <div className="flex items-center justify-between text-xs font-semibold text-[#171717]">
                <span>Security Reports</span>
                <ExternalLink className="w-3.5 h-3.5 text-[#9CA3AF]" />
              </div>
              <p className="text-[11px] text-[#6B7280] mt-1">CSV & assessment summary export archives</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
