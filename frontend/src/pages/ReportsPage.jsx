import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';
import {
  Download,
  FileText,
  ShieldCheck,
  RefreshCw,
  ExternalLink,
  CheckCircle2,
  FileCode,
  FileSpreadsheet,
  Copy,
  Check,
  Eye,
  Plus
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import StatusBadge from '../components/common/StatusBadge';
import Modal from '../components/common/Modal';

export default function ReportsPage() {
  const { securityEvents, incidents, devices, logAudit } = useApp();

  const [dateRange, setDateRange] = useState('24h');
  const [reportType, setReportType] = useState('events');

  // Backend Reports State
  const [reports, setReports] = useState([]);
  const [assessments, setAssessments] = useState([]);
  const [loadingReports, setLoadingReports] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generateModalOpen, setGenerateModalOpen] = useState(false);
  const [selectedAsmId, setSelectedAsmId] = useState('');
  const [selectedFormat, setSelectedFormat] = useState('PDF');
  const [previewHtml, setPreviewHtml] = useState(null);
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [copiedHash, setCopiedHash] = useState(null);
  const [statusMsg, setStatusMsg] = useState(null);
  const [downloadingId, setDownloadingId] = useState(null);

  useEffect(() => {
    loadReportsData();
  }, []);

  const loadReportsData = async () => {
    setLoadingReports(true);
    try {
      const [fetchedReports, fetchedAsms] = await Promise.all([
        api.getReports().catch(() => []),
        api.getAssessments().catch(() => [])
      ]);
      setReports(fetchedReports || []);
      setAssessments(fetchedAsms || []);
      if (fetchedAsms && fetchedAsms.length > 0 && !selectedAsmId) {
        setSelectedAsmId(fetchedAsms[0].id);
      }
    } catch (err) {
      console.warn("Failed to load reports:", err.message);
    } finally {
      setLoadingReports(false);
    }
  };

  const handleGenerateReport = async () => {
    if (!selectedAsmId) return;
    setGenerating(true);
    setStatusMsg(null);
    try {
      const rep = await api.generateReport(selectedAsmId, selectedFormat);
      setStatusMsg({ type: 'success', text: `Generated ${rep.report_type} report ${rep.id} with SHA-256 seal.` });
      setGenerateModalOpen(false);
      logAudit('REPORT_GENERATED', 'Report', rep.id, `Generated ${rep.report_type} for assessment ${selectedAsmId}`);
      await loadReportsData();
    } catch (err) {
      setStatusMsg({ type: 'error', text: err.message || 'Report generation failed.' });
    } finally {
      setGenerating(false);
    }
  };

  const handleDownloadReport = async (rep) => {
    setDownloadingId(rep.id);
    try {
      await api.downloadReportFile(rep.id);
      logAudit('REPORT_DOWNLOADED', 'Report', rep.id, `Downloaded ${rep.report_type} report ${rep.id}.`);
    } catch (err) {
      console.warn("Direct blob download failed, falling back to direct URL:", err.message);
      const url = api.getReportDownloadUrl(rep.id);
      const a = document.createElement('a');
      a.href = url;
      a.download = `medishield-report-${rep.id}.${rep.report_type.toLowerCase()}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } finally {
      setDownloadingId(null);
    }
  };

  const handleViewHtml = async (reportId) => {
    try {
      const htmlText = await api.getReportHtml(reportId);
      setPreviewHtml(htmlText);
      setPreviewModalOpen(true);
    } catch (err) {
      console.error('[ReportsPage] HTML preview error:', err.message);
    }
  };

  const handleCopyHash = (hash, id) => {
    navigator.clipboard.writeText(hash);
    setCopiedHash(id);
    setTimeout(() => setCopiedHash(null), 2000);
  };

  // Severity breakdown
  const severityBreakdown = [
    { severity: 'Critical', count: securityEvents.filter(e => e.severity === 'critical').length, fill: '#EF4444' },
    { severity: 'High', count: securityEvents.filter(e => e.severity === 'high').length, fill: '#F59E0B' },
    { severity: 'Medium', count: securityEvents.filter(e => e.severity === 'medium').length, fill: '#3B82F6' },
    { severity: 'Low', count: securityEvents.filter(e => e.severity === 'low').length, fill: '#10B981' }
  ];

  const handleExportCSV = () => {
    let filename = '';

    if (reportType === 'events') {
      filename = `medishield-security-events-${new Date().toISOString().slice(0, 10)}.csv`;
      api.downloadCsvFile('/reports/security-events.csv', filename).catch(err => {
        console.error("CSV download failed:", err.message);
      });
      logAudit('REPORT_EXPORT', 'SecurityReport', 'security-events.csv', 'Exported security events CSV.');
    } else if (reportType === 'incidents') {
      filename = `medishield-incidents-${new Date().toISOString().slice(0, 10)}.csv`;
      api.downloadCsvFile('/reports/incidents.csv', filename).catch(err => {
        console.error("CSV download failed:", err.message);
      });
      logAudit('REPORT_EXPORT', 'SecurityReport', 'incidents.csv', 'Exported incident investigations CSV.');
    } else if (reportType === 'devices') {
      filename = `medishield-devices-inventory-${new Date().toISOString().slice(0, 10)}.csv`;
      const csvContent = "DeviceID,Name,Type,IPAddress,MACAddress,Firmware,Segment,Status,RiskLevel,SecurityScore\n" +
        devices.map(d =>
          `"${d.id}","${d.name}","${d.deviceType || d.type}","${d.ipAddress}","${d.macAddress}","${d.firmwareVersion}","${d.networkSegment}","${d.status}","${d.riskLevel}","${d.securityScore}"`
        ).join("\n");
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } else {
      filename = `medishield-findings-${new Date().toISOString().slice(0, 10)}.csv`;
      api.downloadCsvFile('/reports/assessments.csv', filename).catch(err => {
        console.error("CSV download failed:", err.message);
      });
      logAudit('REPORT_EXPORT', 'SecurityReport', 'assessments.csv', 'Exported assessment findings CSV report.');
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Header */}
      <div className="pb-4 border-b border-[#E5E7EB] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-[#171717] tracking-tight flex items-center gap-2">
            <span>Security Assessment & Compliance Reports</span>
            <span className="text-xs font-mono text-[#6B7280] font-normal">
              ({reports.length} generated audits)
            </span>
          </h1>
          <p className="text-xs text-[#6B7280] mt-0.5">
            Downloadable PDF and standalone HTML audit reports with cryptographic SHA-256 integrity verification.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setGenerateModalOpen(true)}
            className="px-3 py-1.5 rounded bg-[#1677FF] hover:bg-[#0958D9] text-white text-xs font-medium flex items-center gap-1.5 transition-swiss shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Generate Security Report</span>
          </button>
          <button
            onClick={loadReportsData}
            disabled={loadingReports}
            className="p-1.5 rounded border border-[#E5E7EB] hover:bg-[#F9FAFB] text-[#6B7280] hover:text-[#171717] transition-swiss"
            title="Refresh reports"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingReports ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {statusMsg && (
        <div className={`p-3 rounded border text-xs flex items-center justify-between ${
          statusMsg.type === 'error' ? 'bg-red-50 border-red-200 text-red-800' : 'bg-emerald-50 border-emerald-200 text-emerald-800'
        }`}>
          <span>{statusMsg.text}</span>
          <button onClick={() => setStatusMsg(null)} className="text-xs font-mono">&times;</button>
        </div>
      )}

      {/* 2. Generated Security Reports Catalog (PDF & HTML) */}
      <div className="bg-white border border-[#E5E7EB] rounded-lg overflow-hidden shadow-xs">
        <div className="px-5 py-3.5 bg-[#FAFAFA] border-b border-[#E5E7EB] flex items-center justify-between">
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-[#6B7280]">
              Generated Audit Reports ({reports.length})
            </h2>
            <p className="text-[11px] text-[#9CA3AF] mt-0.5">
              Certified ReportLab PDFs &amp; sanitized Jinja2 HTML audit documents
            </p>
          </div>
          <span className="text-[10px] font-mono text-[#10B981] bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded font-semibold flex items-center gap-1">
            <ShieldCheck className="w-3 h-3" /> SHA-256 SEALED
          </span>
        </div>

        {reports.length === 0 ? (
          <div className="py-12 text-center text-[#9CA3AF] text-xs font-mono">
            {loadingReports ? 'Loading reports archive...' : 'No security reports generated yet. Click "Generate Security Report" to create your first PDF or HTML report.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[#E5E7EB] bg-[#FAFAFA] text-[11px] font-mono text-[#6B7280] uppercase">
                  <th className="py-2.5 px-4 font-semibold">Report ID</th>
                  <th className="py-2.5 px-4 font-semibold">Type</th>
                  <th className="py-2.5 px-4 font-semibold">Target / Assessment</th>
                  <th className="py-2.5 px-4 font-semibold">Size</th>
                  <th className="py-2.5 px-4 font-semibold">SHA-256 Checksum</th>
                  <th className="py-2.5 px-4 font-semibold">Created</th>
                  <th className="py-2.5 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB]">
                {reports.map((rep) => {
                  const isPdf = rep.report_type === 'PDF';
                  const shortHash = rep.sha256_hash ? `${rep.sha256_hash.slice(0, 8)}...${rep.sha256_hash.slice(-8)}` : 'N/A';
                  return (
                    <tr key={rep.id} className="hover:bg-[#F9FAFB] transition-swiss">
                      <td className="py-3 px-4 font-mono font-semibold text-[#171717]">
                        {rep.id}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded font-mono text-[10px] font-bold border ${
                          isPdf ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-blue-50 text-blue-700 border-blue-200'
                        }`}>
                          {isPdf ? <FileText className="w-3 h-3" /> : <FileCode className="w-3 h-3" />}
                          {rep.report_type}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-medium text-[#171717]">{rep.title}</div>
                        <div className="text-[11px] text-[#6B7280] font-mono">{rep.assessment_id}</div>
                      </td>
                      <td className="py-3 px-4 font-mono text-[#6B7280]">
                        {(rep.file_size_bytes / 1024).toFixed(1)} KB
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5">
                          <code className="text-[11px] font-mono text-[#4B5563] bg-[#F3F4F6] px-1.5 py-0.5 rounded">
                            {shortHash}
                          </code>
                          <button
                            onClick={() => handleCopyHash(rep.sha256_hash, rep.id)}
                            title="Copy full SHA-256 hash"
                            className="p-1 rounded text-[#9CA3AF] hover:text-[#171717] transition-swiss"
                          >
                            {copiedHash === rep.id ? <Check className="w-3 h-3 text-[#10B981]" /> : <Copy className="w-3 h-3" />}
                          </button>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-[#6B7280] font-mono text-[11px]">
                        {new Date(rep.created_at).toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {isPdf ? (
                            <button
                              onClick={() => handleDownloadReport(rep)}
                              disabled={downloadingId === rep.id}
                              className="px-2.5 py-1 rounded bg-[#F9FAFB] hover:bg-[#F3F4F6] text-[#171717] border border-[#E5E7EB] text-xs font-medium flex items-center gap-1 transition-swiss cursor-pointer disabled:opacity-50"
                              title="Download ReportLab PDF"
                            >
                              <Download className={`w-3 h-3 text-[#1677FF] ${downloadingId === rep.id ? 'animate-spin' : ''}`} />
                              <span>{downloadingId === rep.id ? 'Saving...' : 'PDF'}</span>
                            </button>
                          ) : (
                            <>
                              <button
                                onClick={() => handleViewHtml(rep.id)}
                                className="px-2.5 py-1 rounded bg-[#F9FAFB] hover:bg-[#F3F4F6] text-[#171717] border border-[#E5E7EB] text-xs font-medium flex items-center gap-1 transition-swiss cursor-pointer"
                              >
                                <Eye className="w-3 h-3 text-[#1677FF]" />
                                <span>Preview</span>
                              </button>
                              <button
                                onClick={() => handleDownloadReport(rep)}
                                disabled={downloadingId === rep.id}
                                className="p-1 rounded text-[#6B7280] hover:text-[#171717] border border-[#E5E7EB] hover:bg-[#F3F4F6] transition-swiss cursor-pointer disabled:opacity-50"
                                title="Download standalone HTML file"
                              >
                                <Download className={`w-3.5 h-3.5 ${downloadingId === rep.id ? 'animate-spin' : ''}`} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 3. Distribution Visualizer & Standard CSV Exports */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Severity Visualizer */}
        <div className="lg:col-span-7 bg-white border border-[#E5E7EB] rounded-lg p-5 space-y-4 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-[#F3F4F6]">
            <h2 className="text-sm font-semibold text-[#171717]">
              Security Events Severity Distribution
            </h2>
            <span className="text-xs font-mono text-[#6B7280]">
              {securityEvents.length} Total Events
            </span>
          </div>

          <div className="h-52 w-full">
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

        {/* CSV Exports Card */}
        <div className="lg:col-span-5 bg-white border border-[#E5E7EB] rounded-lg p-5 space-y-4 shadow-xs">
          <h2 className="text-sm font-semibold text-[#171717] pb-3 border-b border-[#F3F4F6]">
            Direct Raw Telemetry & CSV Exports
          </h2>

          <div className="space-y-3">
            <div>
              <label className="block text-[#6B7280] text-xs font-medium mb-1">Select Dataset</label>
              <select
                value={reportType}
                onChange={(e) => setReportType(e.target.value)}
                className="w-full bg-[#FAFAFA] border border-[#E5E7EB] rounded p-2 text-xs text-[#171717] focus:outline-none font-mono"
              >
                <option value="events">Security Ingress & IDS Events</option>
                <option value="devices">Clinical IoMT Device Inventory</option>
                <option value="assessments">Multi-Tool Assessment Findings (API Stream)</option>
              </select>
            </div>

            <div className="pt-2 flex items-center justify-between">
              <span className="text-[11px] text-[#6B7280] font-mono">Format: RFC 4180 CSV</span>
              <button
                onClick={handleExportCSV}
                className="px-3.5 py-1.5 rounded bg-[#1677FF] hover:bg-[#0958D9] text-white text-xs font-medium flex items-center gap-1.5 transition-swiss shadow-xs"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export CSV Stream</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modal: Generate Report */}
      <Modal
        isOpen={generateModalOpen}
        onClose={() => setGenerateModalOpen(false)}
        title="Generate Security Assessment Report"
        subtitle="Produce certified ReportLab PDF or standalone sanitized HTML report"
        footer={
          <>
            <button
              onClick={() => setGenerateModalOpen(false)}
              className="px-3 py-1.5 rounded border border-[#E5E7EB] text-xs text-[#6B7280] hover:bg-[#F3F4F6]"
            >
              Cancel
            </button>
            <button
              onClick={handleGenerateReport}
              disabled={generating || !selectedAsmId}
              className="px-4 py-1.5 rounded bg-[#1677FF] hover:bg-[#0958D9] text-white text-xs font-semibold flex items-center gap-1.5 disabled:opacity-50"
            >
              {generating ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <FileText className="w-3.5 h-3.5" />}
              <span>{generating ? 'Generating Document...' : `Generate ${selectedFormat}`}</span>
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-[#171717] font-semibold mb-1">Target Assessment</label>
            <select
              value={selectedAsmId}
              onChange={(e) => setSelectedAsmId(e.target.value)}
              className="w-full bg-white border border-[#E5E7EB] rounded p-2 text-xs font-mono text-[#171717]"
            >
              {assessments.map(a => (
                <option key={a.id} value={a.id}>
                  {a.id} &bull; {a.device_id} &bull; Score: {a.security_score}/100 &bull; ({a.total_findings} findings)
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[#171717] font-semibold mb-1">Report Format</label>
            <div className="grid grid-cols-2 gap-3">
              <label
                className={`p-3 rounded border cursor-pointer flex items-center gap-2 transition-swiss ${
                  selectedFormat === 'PDF' ? 'bg-rose-50/60 border-rose-400 text-rose-900 font-semibold' : 'border-[#E5E7EB] hover:bg-[#FAFAFA]'
                }`}
              >
                <input
                  type="radio"
                  name="fmt"
                  checked={selectedFormat === 'PDF'}
                  onChange={() => setSelectedFormat('PDF')}
                  className="hidden"
                />
                <FileText className="w-4 h-4 text-rose-600" />
                <div>
                  <div className="text-xs">PDF Document</div>
                  <div className="text-[10px] text-[#6B7280] font-normal">ReportLab publication layout</div>
                </div>
              </label>

              <label
                className={`p-3 rounded border cursor-pointer flex items-center gap-2 transition-swiss ${
                  selectedFormat === 'HTML' ? 'bg-blue-50/60 border-blue-400 text-blue-900 font-semibold' : 'border-[#E5E7EB] hover:bg-[#FAFAFA]'
                }`}
              >
                <input
                  type="radio"
                  name="fmt"
                  checked={selectedFormat === 'HTML'}
                  onChange={() => setSelectedFormat('HTML')}
                  className="hidden"
                />
                <FileCode className="w-4 h-4 text-blue-600" />
                <div>
                  <div className="text-xs">HTML Audit</div>
                  <div className="text-[10px] text-[#6B7280] font-normal">Standalone sanitized web report</div>
                </div>
              </label>
            </div>
          </div>

          <div className="p-3 bg-[#F9FAFB] border border-[#E5E7EB] rounded text-[11px] text-[#6B7280] leading-relaxed">
            Report generation computes cryptographic SHA-256 digest of the output document and logs an immutable audit event in the system log chain.
          </div>
        </div>
      </Modal>

      {/* Modal: Preview HTML Report */}
      <Modal
        isOpen={previewModalOpen}
        onClose={() => setPreviewModalOpen(false)}
        title="HTML Report Preview"
        subtitle="Rendered standalone security assessment document"
        maxWidth="max-w-4xl"
        footer={
          <button
            onClick={() => setPreviewModalOpen(false)}
            className="px-3.5 py-1.5 rounded bg-[#171717] text-white text-xs font-medium"
          >
            Close Preview
          </button>
        }
      >
        <div className="border border-[#E5E7EB] rounded overflow-hidden h-[70vh]">
          <iframe
            srcDoc={previewHtml}
            title="HTML Report Preview"
            className="w-full h-full border-0"
            sandbox="allow-same-origin"
          />
        </div>
      </Modal>
    </div>
  );
}
