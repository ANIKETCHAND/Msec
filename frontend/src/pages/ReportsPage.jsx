import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  BarChart3,
  Download,
  Calendar,
  Filter,
  FileSpreadsheet,
  CheckCircle2,
  ShieldCheck,
  FileText,
  Activity,
  Layers
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';

export default function ReportsPage() {
  const { securityEvents, incidents, devices, logAudit } = useApp();

  const [dateRange, setDateRange] = useState('24h');
  const [reportType, setReportType] = useState('events');

  // Aggregated data for reports
  const severityBreakdown = [
    { severity: 'Critical', count: securityEvents.filter(e => e.severity === 'critical').length, fill: '#ef4444' },
    { severity: 'High', count: securityEvents.filter(e => e.severity === 'high').length, fill: '#f97316' },
    { severity: 'Medium', count: securityEvents.filter(e => e.severity === 'medium').length, fill: '#f59e0b' },
    { severity: 'Low', count: securityEvents.filter(e => e.severity === 'low').length, fill: '#0ea5e9' }
  ];

  const deviceRiskBreakdown = [
    { risk: 'Low', count: devices.filter(d => d.riskLevel === 'low').length, fill: '#10b981' },
    { risk: 'Medium', count: devices.filter(d => d.riskLevel === 'medium').length, fill: '#f59e0b' },
    { risk: 'High', count: devices.filter(d => d.riskLevel === 'high').length, fill: '#f97316' },
    { risk: 'Critical', count: devices.filter(d => d.riskLevel === 'critical').length, fill: '#ef4444' }
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
    } else {
      filename = `medishield-incidents-report-${new Date().toISOString().slice(0, 10)}.csv`;
      csvContent = "IncidentID,Title,Severity,Status,AssignedTo,DeviceID,CreatedAt\n" +
        incidents.map(i =>
          `"${i.id}","${i.title}","${i.severity}","${i.status}","${i.assignedTo}","${i.deviceId}","${i.createdAt}"`
        ).join("\n");
    }

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.click();

    logAudit('REPORT_EXPORT', 'SecurityReport', filename, `Exported ${reportType} report as CSV.`);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-mediblue-400" />
            Security Intelligence & Compliance Reports
          </h1>
          <p className="text-xs text-slate-400">
            Export structured security audits, incident metrics, and inventory compliance records.
          </p>
        </div>

        <button
          onClick={handleExportCSV}
          className="px-4 py-2 bg-mediblue-600 hover:bg-mediblue-500 text-white rounded-xl text-xs font-semibold flex items-center gap-2 transition shadow-lg shadow-mediblue-600/20"
        >
          <Download className="w-4 h-4" />
          Download Report (CSV)
        </button>
      </div>

      {/* Report Type Selector & Controls */}
      <div className="bg-navy-900 border border-navy-800 p-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setReportType('events')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${reportType === 'events' ? 'bg-mediblue-600 text-white' : 'bg-navy-800 text-slate-400 hover:text-white'}`}
          >
            Security Events Stream
          </button>
          <button
            onClick={() => setReportType('incidents')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${reportType === 'incidents' ? 'bg-mediblue-600 text-white' : 'bg-navy-800 text-slate-400 hover:text-white'}`}
          >
            Incident Triage Log
          </button>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-400">Time Range:</span>
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="bg-navy-950 border border-navy-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none"
          >
            <option value="24h">Past 24 Hours</option>
            <option value="7d">Past 7 Days</option>
            <option value="30d">Past 30 Days</option>
            <option value="all">All Synthetic History</option>
          </select>
        </div>
      </div>

      {/* Analytics Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Severity Distribution Chart */}
        <div className="bg-navy-900 border border-navy-800 p-5 rounded-2xl space-y-4">
          <div>
            <h2 className="text-sm font-bold text-white">Event Severity Distribution</h2>
            <p className="text-[11px] text-slate-400">Active alerts grouped by risk tier.</p>
          </div>

          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={severityBreakdown} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="severity" stroke="#64748b" tick={{ fontSize: 11 }} />
                <YAxis stroke="#64748b" tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '0.75rem', fontSize: '11px' }}
                />
                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                  {severityBreakdown.map((entry, index) => (
                    <Bar key={`cell-${index}`} dataKey="count" fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Device Posture Breakdown */}
        <div className="bg-navy-900 border border-navy-800 p-5 rounded-2xl space-y-4">
          <div>
            <h2 className="text-sm font-bold text-white">Device Inventory Risk Posture</h2>
            <p className="text-[11px] text-slate-400">IoMT asset vulnerability and risk stratification.</p>
          </div>

          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={deviceRiskBreakdown} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="risk" stroke="#64748b" tick={{ fontSize: 11 }} />
                <YAxis stroke="#64748b" tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '0.75rem', fontSize: '11px' }}
                />
                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                  {deviceRiskBreakdown.map((entry, index) => (
                    <Bar key={`cell-risk-${index}`} dataKey="count" fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Tabular Preview */}
      <div className="bg-navy-900 border border-navy-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="p-4 border-b border-navy-800 flex items-center justify-between text-xs">
          <span className="font-bold text-white uppercase tracking-wider">
            Export Preview ({reportType === 'events' ? 'Security Events' : 'Incidents'})
          </span>
          <span className="text-slate-400 font-mono">
            {reportType === 'events' ? securityEvents.length : incidents.length} records ready
          </span>
        </div>

        <div className="overflow-x-auto max-h-72">
          <table className="w-full text-left text-xs">
            <thead className="bg-navy-950 text-slate-400 uppercase text-[10px] tracking-wider border-b border-navy-800">
              <tr>
                <th className="py-2.5 px-4">ID</th>
                <th className="py-2.5 px-4">{reportType === 'events' ? 'Rule' : 'Title'}</th>
                <th className="py-2.5 px-4">Target Device</th>
                <th className="py-2.5 px-4">Severity</th>
                <th className="py-2.5 px-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-navy-800 text-slate-300">
              {reportType === 'events' ? (
                securityEvents.map(e => (
                  <tr key={e.id} className="hover:bg-navy-800/40">
                    <td className="py-2.5 px-4 font-mono text-mediblue-400">{e.id}</td>
                    <td className="py-2.5 px-4">{e.ruleName}</td>
                    <td className="py-2.5 px-4">{e.deviceName}</td>
                    <td className="py-2.5 px-4 uppercase font-semibold">{e.severity}</td>
                    <td className="py-2.5 px-4 capitalize">{e.status}</td>
                  </tr>
                ))
              ) : (
                incidents.map(i => (
                  <tr key={i.id} className="hover:bg-navy-800/40">
                    <td className="py-2.5 px-4 font-mono text-mediblue-400">{i.id}</td>
                    <td className="py-2.5 px-4 font-semibold text-white">{i.title}</td>
                    <td className="py-2.5 px-4">{i.deviceId}</td>
                    <td className="py-2.5 px-4 uppercase font-semibold">{i.severity}</td>
                    <td className="py-2.5 px-4 capitalize">{i.status}</td>
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
