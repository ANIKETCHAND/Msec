import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  BarChart3,
  Download,
  Calendar,
  FileSpreadsheet,
  CheckCircle2,
  FileText,
  Layers,
  ExternalLink
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';

export default function ReportsPage() {
  const { securityEvents, incidents, devices, logAudit } = useApp();

  const [dateRange, setDateRange] = useState('24h');
  const [reportType, setReportType] = useState('events');

  // Aggregated data for reports
  const severityBreakdown = [
    { severity: 'Critical', count: securityEvents.filter(e => e.severity === 'critical').length, fill: '#EF4444' },
    { severity: 'High', count: securityEvents.filter(e => e.severity === 'high').length, fill: '#F59E0B' },
    { severity: 'Medium', count: securityEvents.filter(e => e.severity === 'medium').length, fill: '#3B82F6' },
    { severity: 'Low', count: securityEvents.filter(e => e.severity === 'low').length, fill: '#10B981' }
  ];

  const handleExportCSV = () => {
    let filename = '';
    let csvContent = '';

    if (reportType === 'events') {
      filename = `medishield-security-events-${new Date().toISOString().slice(0, 10)}.csv`;
      csvContent = "EventID,Timestamp,RuleID,RuleName,DeviceID,DeviceName,Severity,Status\n" +
        securityEvents.map(e =>
          `"${e.id}","${e.timestamp}","${e.ruleId}","${e.ruleName}","${e.deviceId}","${e.deviceName}","${e.severity}","${e.status}"`
        ).join("\n");
    } else if (reportType === 'incidents') {
      filename = `medishield-incidents-report-${new Date().toISOString().slice(0, 10)}.csv`;
      csvContent = "IncidentID,Title,Severity,Status,AssignedTo,DeviceID,CreatedAt\n" +
        incidents.map(i =>
          `"${i.id}","${i.title}","${i.severity}","${i.status}","${i.assignedTo}","${i.deviceId}","${i.createdAt}"`
        ).join("\n");
    } else {
      window.location.href = '/api/reports/assessments.csv';
      logAudit('REPORT_EXPORT', 'SecurityReport', 'assessments.csv', 'Exported assessment findings CSV report.');
      return;
    }

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    logAudit('REPORT_EXPORT', 'SecurityReport', filename, `Exported ${reportType} report.`);
  };

  return (
    <div className="space-y-6">
      {/* 1. Header */}
      <div className="pb-4 border-b border-[#E5E7EB] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-[#171717] tracking-tight flex items-center gap-2">
            <span>Security Assessment & Compliance Reports</span>
          </h1>
          <p className="text-xs text-[#6B7280] mt-0.5">
            Export certified IoMT assessment logs, IDS event telemetry, and institutional audit archives.
          </p>
        </div>

        <button
          onClick={handleExportCSV}
          className="px-3.5 py-1.5 rounded bg-[#1677FF] hover:bg-[#0958D9] text-white text-xs font-medium flex items-center gap-1.5 transition-swiss shadow-xs shrink-0"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export {reportType.toUpperCase()} CSV</span>
        </button>
      </div>

      {/* 2. Controls */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
        <div>
          <label className="block text-[#6B7280] font-medium mb-1">Report Data Category</label>
          <select
            value={reportType}
            onChange={(e) => setReportType(e.target.value)}
            className="w-full bg-white border border-[#E5E7EB] rounded p-2 text-[#171717] focus:outline-none font-mono"
          >
            <option value="events">Security Ingress & IDS Events</option>
            <option value="incidents">Incident Management Tickets</option>
            <option value="assessments">Multi-Tool Assessment Findings (Live API Stream)</option>
          </select>
        </div>

        <div>
          <label className="block text-[#6B7280] font-medium mb-1">Time Horizon Window</label>
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="w-full bg-white border border-[#E5E7EB] rounded p-2 text-[#171717] focus:outline-none font-mono"
          >
            <option value="24h">Past 24 Hours</option>
            <option value="7d">Past 7 Days</option>
            <option value="30d">Past 30 Days</option>
            <option value="all">Full Historical Log</option>
          </select>
        </div>
      </div>

      {/* 3. Distribution Visualizer */}
      <div className="bg-white border border-[#E5E7EB] rounded-lg p-5 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[#F3F4F6]">
          <h2 className="text-sm font-semibold text-[#171717]">
            Security Events by Severity Breakdown
          </h2>
          <span className="text-xs font-mono text-[#6B7280]">
            {securityEvents.length} Total Logged Events
          </span>
        </div>

        <div className="h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={severityBreakdown} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
              <XAxis dataKey="severity" stroke="#9CA3AF" tick={{ fontSize: 11 }} />
              <YAxis stroke="#9CA3AF" tick={{ fontSize: 11 }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#FFFFFF',
                  borderColor: '#E5E7EB',
                  borderRadius: '6px',
                  fontSize: '12px'
                }}
              />
              <Bar dataKey="count" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 4. Ready Downloadable Exports */}
      <div className="bg-white border border-[#E5E7EB] rounded-lg p-5 space-y-3">
        <h2 className="text-sm font-semibold text-[#171717] pb-3 border-b border-[#F3F4F6]">
          Standard Compliance Exports
        </h2>

        <div className="divide-y divide-[#F3F4F6]">
          <div className="py-3 flex items-center justify-between text-xs">
            <div>
              <p className="font-semibold text-[#171717]">Institutional IoMT Assessment Report</p>
              <p className="text-[11px] text-[#6B7280] font-mono mt-0.5">Format: CSV &bull; Backend Endpoint: /api/reports/assessments.csv</p>
            </div>
            <a
              href="/api/reports/assessments.csv"
              className="px-3 py-1.5 rounded border border-[#E5E7EB] hover:bg-[#F9FAFB] text-[#1677FF] font-medium flex items-center gap-1.5 transition-swiss"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download</span>
            </a>
          </div>

          <div className="py-3 flex items-center justify-between text-xs">
            <div>
              <p className="font-semibold text-[#171717]">Clinical Telemetry Ingress Log</p>
              <p className="text-[11px] text-[#6B7280] font-mono mt-0.5">Format: CSV &bull; Client Generated from Local State</p>
            </div>
            <button
              onClick={handleExportCSV}
              className="px-3 py-1.5 rounded border border-[#E5E7EB] hover:bg-[#F9FAFB] text-[#1677FF] font-medium flex items-center gap-1.5 transition-swiss"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
