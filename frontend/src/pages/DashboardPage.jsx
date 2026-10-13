import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';
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
  Layers,
  ExternalLink,
  RefreshCw,
  Inbox,
  Activity,
  CheckCircle2,
  Wrench,
  Lock,
  Network
} from 'lucide-react';

export default function DashboardPage() {
  const {
    devices,
    securityEvents,
    setCurrentPage,
    setSelectedDeviceId
  } = useApp();

  const [secondaryExpanded, setSecondaryExpanded] = useState(false);
  const [summaryData, setSummaryData] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchSummary = async () => {
    setLoading(true);
    try {
      const data = await api.getDashboardSummary();
      if (data) {
        setSummaryData(data);
      }
    } catch (err) {
      console.warn('[Dashboard] Summary fetch failed, falling back to local state:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, []);

  // 1. Authoritative Backend Metrics with safe local fallbacks
  const monitoredDevices = summaryData?.monitored_devices ?? devices.length;
  const completedAssessments = summaryData?.completed_assessments ?? 0;
  const criticalFindings = summaryData?.critical_findings ?? 0;
  const highFindings = summaryData?.high_findings ?? 0;
  const openSecurityEvents = summaryData?.active_security_events ?? securityEvents.filter(e => e.status === 'open' || e.status === 'investigating').length;
  const generatedReports = summaryData?.generated_reports ?? 0;

  // Status distributions from live backend response
  const onlineDevices = summaryData?.device_status_distribution?.online ?? devices.filter(d => d.status === 'online').length;
  const suspiciousDevices = summaryData?.device_status_distribution?.suspicious_isolated ?? devices.filter(d => d.status === 'suspicious' || d.status === 'isolated').length;
  const offlineDevices = summaryData?.device_status_distribution?.offline ?? devices.filter(d => d.status === 'offline').length;

  const onlinePct = summaryData?.device_status_distribution?.online_pct ?? Math.round((onlineDevices / (monitoredDevices || 1)) * 100);
  const suspiciousPct = summaryData?.device_status_distribution?.suspicious_isolated_pct ?? Math.round((suspiciousDevices / (monitoredDevices || 1)) * 100);
  const offlinePct = summaryData?.device_status_distribution?.offline_pct ?? Math.round((offlineDevices / (monitoredDevices || 1)) * 100);

  // Risk distribution from live backend response
  const riskDist = summaryData?.security_risk_distribution || {
    low: devices.filter(d => d.riskLevel === 'low').length,
    medium: devices.filter(d => d.riskLevel === 'medium').length,
    high: devices.filter(d => d.riskLevel === 'high').length,
    critical: devices.filter(d => d.riskLevel === 'critical').length,
  };

  // Institutional posture score
  const avgPostureScore = summaryData?.institutional_posture_score != null
    ? Math.round(summaryData.institutional_posture_score)
    : (monitoredDevices > 0
        ? Math.round(devices.reduce((acc, d) => acc + (d.securityScore ?? 85), 0) / monitoredDevices)
        : 85);

  // Recent Assessments
  const recentAssessments = summaryData?.recent_assessments || [];

  // Recent Security Events
  const recentEvents = (summaryData?.recent_security_events && summaryData.recent_security_events.length > 0)
    ? summaryData.recent_security_events.map(e => ({
        id: e.id,
        ruleName: e.rule_name || 'IoMT Anomaly Detected',
        severity: (e.severity || 'medium').toLowerCase(),
        deviceId: e.device_id,
        timestamp: e.timestamp ? new Date(e.timestamp).toLocaleTimeString() : 'Recent',
        status: (e.status || 'open').toLowerCase()
      }))
    : securityEvents.slice(0, 5);

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Top Header with Primary Assessment CTA */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[#E5E7EB] pb-5">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl sm:text-2xl font-semibold text-[#171717] tracking-tight">
              IoMT Security Dashboard
            </h1>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live Telemetry
            </span>
          </div>
          <p className="text-xs text-[#6B7280] mt-1">
            Real-time medical device telemetry, risk posture, and authorized security assessments.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchSummary}
            title="Refresh dashboard summary"
            className="p-2 border border-[#E5E7EB] hover:bg-[#F9FAFB] text-[#6B7280] hover:text-[#171717] rounded-lg transition-swiss cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-[#1677FF]' : ''}`} />
          </button>
          <button
            onClick={() => setCurrentPage('assessment-center')}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#1677FF] hover:bg-[#125ecc] text-white text-xs font-semibold rounded-lg shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-[#1677FF]/20 cursor-pointer"
          >
            <Shield className="w-4 h-4" />
            <span>Start New Assessment</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 1. SIX AUTHORITATIVE BACKEND METRICS */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        <MetricCard
          title="Monitored Devices"
          value={monitoredDevices}
          secondary={`${onlineDevices} online in VLANs`}
          icon={Server}
          onClick={() => setCurrentPage('devices')}
        />
        <MetricCard
          title="Completed Assessments"
          value={completedAssessments}
          secondary="Audits executed"
          icon={ShieldCheck}
          onClick={() => setCurrentPage('assessment-center')}
        />
        <MetricCard
          title="Critical Findings"
          value={criticalFindings}
          secondary="CVSS &gt;= 9.0 exploits"
          icon={AlertTriangle}
          onClick={() => setCurrentPage('assessment-center')}
        />
        <MetricCard
          title="High-Risk Findings"
          value={highFindings}
          secondary="Vulnerabilities identified"
          icon={Activity}
          onClick={() => setCurrentPage('assessment-center')}
        />
        <MetricCard
          title="Open Security Events"
          value={openSecurityEvents}
          secondary="Active IDS detections"
          icon={Shield}
          onClick={() => setCurrentPage('security-events')}
        />
        <MetricCard
          title="Generated Reports"
          value={generatedReports}
          secondary="PDF & HTML compliance"
          icon={FileText}
          onClick={() => setCurrentPage('reports')}
        />
      </div>

      {/* 2. MAIN TWO-COLUMN WORKSPACE */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Posture, Status & Risk Distribution (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Institutional Security Posture */}
          <div className="bg-white border border-[#E5E7EB] rounded-lg p-5">
            <div className="flex items-center justify-between pb-3 border-b border-[#F3F4F6]">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#6B7280]">
                Institutional Security Posture
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
                style={{ width: `${Math.min(100, Math.max(0, avgPostureScore))}%` }}
              />
            </div>

            <p className="text-[11px] text-[#6B7280] mt-3 leading-relaxed">
              Institutional score computed across {monitoredDevices} medical endpoints factoring clinical criticality weighting (Ventilators 1.5x, Infusion Pumps 1.3x) and vulnerability findings.
            </p>

            <button
              onClick={() => setCurrentPage('assessment-center')}
              className="mt-4 w-full py-2 px-3 rounded border border-[#1677FF]/30 hover:border-[#1677FF] bg-[#1677FF]/5 hover:bg-[#1677FF]/10 text-xs font-medium text-[#1677FF] flex items-center justify-center gap-1.5 transition-swiss cursor-pointer"
            >
              <Shield className="w-3.5 h-3.5" />
              <span>Launch Assessment in Assessment Center</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Device Status Summary */}
          <div className="bg-white border border-[#E5E7EB] rounded-lg p-5">
            <div className="flex items-center justify-between pb-3 border-b border-[#F3F4F6]">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#6B7280]">
                Device Status Summary
              </span>
              <button
                onClick={() => setCurrentPage('devices')}
                className="text-xs text-[#1677FF] hover:underline flex items-center gap-0.5 cursor-pointer"
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
                    {onlineDevices} ({onlinePct}%)
                  </span>
                </div>
                <div className="w-full bg-[#F3F4F6] rounded-full h-1.5 overflow-hidden">
                  <div className="bg-[#10B981] h-full" style={{ width: `${onlinePct}%` }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-[#171717] font-medium flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#F59E0B]" /> Suspicious / Isolated
                  </span>
                  <span className="font-mono text-[#6B7280] tabular-nums">
                    {suspiciousDevices} ({suspiciousPct}%)
                  </span>
                </div>
                <div className="w-full bg-[#F3F4F6] rounded-full h-1.5 overflow-hidden">
                  <div className="bg-[#F59E0B] h-full" style={{ width: `${suspiciousPct}%` }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-[#171717] font-medium flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#EF4444]" /> Offline
                  </span>
                  <span className="font-mono text-[#6B7280] tabular-nums">
                    {offlineDevices} ({offlinePct}%)
                  </span>
                </div>
                <div className="w-full bg-[#F3F4F6] rounded-full h-1.5 overflow-hidden">
                  <div className="bg-[#EF4444] h-full" style={{ width: `${offlinePct}%` }} />
                </div>
              </div>
            </div>
          </div>

          {/* Security Risk Distribution */}
          <div className="bg-white border border-[#E5E7EB] rounded-lg p-5">
            <div className="flex items-center justify-between pb-3 border-b border-[#F3F4F6]">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#6B7280]">
                Security Risk Distribution
              </span>
              <span className="text-xs text-[#6B7280] font-mono">
                {monitoredDevices} Assets
              </span>
            </div>

            <div className="mt-4 grid grid-cols-4 gap-2 text-center">
              <div className="p-2.5 rounded bg-emerald-50/60 border border-emerald-100">
                <span className="block text-lg font-semibold text-emerald-700 font-mono tabular-nums">{riskDist.low}</span>
                <span className="text-[10px] uppercase font-semibold text-emerald-600 tracking-wider">Low</span>
              </div>
              <div className="p-2.5 rounded bg-amber-50/60 border border-amber-100">
                <span className="block text-lg font-semibold text-amber-700 font-mono tabular-nums">{riskDist.medium}</span>
                <span className="text-[10px] uppercase font-semibold text-amber-600 tracking-wider">Medium</span>
              </div>
              <div className="p-2.5 rounded bg-orange-50/60 border border-orange-100">
                <span className="block text-lg font-semibold text-orange-700 font-mono tabular-nums">{riskDist.high}</span>
                <span className="text-[10px] uppercase font-semibold text-orange-600 tracking-wider">High</span>
              </div>
              <div className="p-2.5 rounded bg-rose-50/60 border border-rose-100">
                <span className="block text-lg font-semibold text-rose-700 font-mono tabular-nums">{riskDist.critical}</span>
                <span className="text-[10px] uppercase font-semibold text-rose-600 tracking-wider">Critical</span>
              </div>
            </div>
          </div>

        </div>

        {/* Right Column: Recent Assessments & Recent Security Events (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Section 1: Recent Assessments */}
          <div className="bg-white border border-[#E5E7EB] rounded-lg p-5">
            <div className="flex items-center justify-between pb-3 border-b border-[#F3F4F6]">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-[#6B7280]">
                  Recent Security Assessments
                </span>
                <p className="text-[11px] text-[#9CA3AF] mt-0.5">Vulnerability audit executions and CVE scans</p>
              </div>
              <button
                onClick={() => setCurrentPage('assessment-center')}
                className="text-xs text-[#1677FF] hover:underline flex items-center gap-0.5 cursor-pointer"
              >
                <span>Assessment Center</span>
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>

            {recentAssessments.length === 0 ? (
              <div className="py-8 text-center text-[#6B7280]">
                <Shield className="w-8 h-8 mx-auto mb-2 text-[#9CA3AF] stroke-[1.5]" />
                <p className="text-xs font-medium text-[#374151]">No assessments recorded yet</p>
                <p className="text-[11px] text-[#9CA3AF] mt-0.5 mb-3">
                  Select a registered IoMT asset in Assessment Center to perform an authorized defensive scan.
                </p>
                <button
                  onClick={() => setCurrentPage('assessment-center')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#1677FF] hover:bg-[#125ecc] text-white text-xs font-medium rounded transition-swiss cursor-pointer"
                >
                  <Shield className="w-3.5 h-3.5" />
                  <span>Start Assessment</span>
                </button>
              </div>
            ) : (
              <div className="mt-2 divide-y divide-[#F3F4F6]">
                {recentAssessments.map((asm) => (
                  <div
                    key={asm.id}
                    onClick={() => setCurrentPage('assessment-center')}
                    className="py-3 flex items-center justify-between gap-3 hover:bg-[#F9FAFB] px-2 rounded cursor-pointer transition-swiss"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-mono text-[#1677FF] font-semibold">{asm.id}</span>
                        <span className="text-xs font-semibold text-[#171717]">{asm.profile.replace(/_/g, ' ')}</span>
                        <StatusBadge
                          status={asm.status === 'COMPLETED' ? 'safe' : asm.status === 'RUNNING' ? 'warning' : 'neutral'}
                          size="xs"
                        />
                      </div>
                      <p className="text-[11px] text-[#6B7280] font-mono mt-0.5 truncate">
                        Target: {asm.device_id} ({asm.target_ip}) • Score: {asm.security_score}/100 • Findings: {asm.total_findings}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setCurrentPage('reports');
                        }}
                        className="text-[11px] text-[#1677FF] hover:underline flex items-center gap-1"
                      >
                        <FileText className="w-3 h-3" />
                        <span>Report</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section 2: Recent Security Events */}
          <div className="bg-white border border-[#E5E7EB] rounded-lg p-5">
            <div className="flex items-center justify-between pb-3 border-b border-[#F3F4F6]">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-[#6B7280]">
                  Recent Security Events
                </span>
                <p className="text-[11px] text-[#9CA3AF] mt-0.5">Real-time telemetry anomalies and passive IDS alerts</p>
              </div>
              <button
                onClick={() => setCurrentPage('security-events')}
                className="text-xs text-[#1677FF] hover:underline flex items-center gap-0.5 cursor-pointer"
              >
                <span>All Events ({openSecurityEvents})</span>
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>

            {recentEvents.length === 0 ? (
              <div className="py-8 text-center text-[#6B7280]">
                <Inbox className="w-8 h-8 mx-auto mb-2 text-[#9CA3AF] stroke-[1.5]" />
                <p className="text-xs font-medium text-[#374151]">No active security events</p>
                <p className="text-[11px] text-[#9CA3AF] mt-0.5">All monitored IoMT telemetry is operating within baseline bounds.</p>
              </div>
            ) : (
              <div className="mt-2 divide-y divide-[#F3F4F6]">
                {recentEvents.map((evt) => (
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
            )}
          </div>

        </div>
      </div>

      {/* 3. SECONDARY WORKSPACES EXPANDABLE SECTION */}
      <div className="border border-[#E5E7EB] rounded-lg bg-white overflow-hidden">
        <button
          onClick={() => setSecondaryExpanded(!secondaryExpanded)}
          className="w-full px-5 py-3.5 bg-[#F9FAFB] hover:bg-[#F3F4F6] text-xs font-medium text-[#171717] flex items-center justify-between transition-swiss select-none cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-[#6B7280]" />
            <span>Secondary Architecture & Governance Workspaces</span>
          </div>
          <ChevronDown className={`w-4 h-4 text-[#6B7280] transition-swiss ${secondaryExpanded ? 'rotate-180' : ''}`} />
        </button>

        {secondaryExpanded && (
          <div className="p-5 border-t border-[#E5E7EB] grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-fadeIn">
            <div
              onClick={() => setCurrentPage('tools')}
              className="p-3.5 rounded border border-[#E5E7EB] hover:border-[#1677FF] hover:bg-[#F9FAFB] cursor-pointer transition-swiss"
            >
              <div className="flex items-center justify-between text-xs font-semibold text-[#171717]">
                <div className="flex items-center gap-1.5">
                  <Wrench className="w-3.5 h-3.5 text-[#1677FF]" />
                  <span>Security Tools</span>
                </div>
                <ExternalLink className="w-3.5 h-3.5 text-[#9CA3AF]" />
              </div>
              <p className="text-[11px] text-[#6B7280] mt-1">Defensive scanner engines & passive IDS sensors</p>
            </div>

            <div
              onClick={() => setCurrentPage('topology')}
              className="p-3.5 rounded border border-[#E5E7EB] hover:border-[#1677FF] hover:bg-[#F9FAFB] cursor-pointer transition-swiss"
            >
              <div className="flex items-center justify-between text-xs font-semibold text-[#171717]">
                <div className="flex items-center gap-1.5">
                  <Network className="w-3.5 h-3.5 text-[#1677FF]" />
                  <span>Network Topology</span>
                </div>
                <ExternalLink className="w-3.5 h-3.5 text-[#9CA3AF]" />
              </div>
              <p className="text-[11px] text-[#6B7280] mt-1">Clinical VLAN segmentation viewer (ICU, Ward, ER)</p>
            </div>

            <div
              onClick={() => setCurrentPage('audit-logs')}
              className="p-3.5 rounded border border-[#E5E7EB] hover:border-[#1677FF] hover:bg-[#F9FAFB] cursor-pointer transition-swiss"
            >
              <div className="flex items-center justify-between text-xs font-semibold text-[#171717]">
                <div className="flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#1677FF]" />
                  <span>Cryptographic Audit Chain</span>
                </div>
                <ExternalLink className="w-3.5 h-3.5 text-[#9CA3AF]" />
              </div>
              <p className="text-[11px] text-[#6B7280] mt-1">SHA-256 tamper-evident integrity validator</p>
            </div>

            <div
              onClick={() => setCurrentPage('reports')}
              className="p-3.5 rounded border border-[#E5E7EB] hover:border-[#1677FF] hover:bg-[#F9FAFB] cursor-pointer transition-swiss"
            >
              <div className="flex items-center justify-between text-xs font-semibold text-[#171717]">
                <div className="flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-[#1677FF]" />
                  <span>Security Reports</span>
                </div>
                <ExternalLink className="w-3.5 h-3.5 text-[#9CA3AF]" />
              </div>
              <p className="text-[11px] text-[#6B7280] mt-1">PDF & HTML report archives and downloads</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
