import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';
import {
  Download,
  FileText,
  ShieldCheck,
  RefreshCw,
  FileCode,
  Copy,
  Check,
  Eye,
  Plus,
  Search,
  X
} from 'lucide-react';
import StatusBadge from '../components/common/StatusBadge';
import Modal from '../components/common/Modal';
import { formatDateTime } from '../utils/dateUtils';

export default function ReportsPage() {
  const { logAudit } = useApp();

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

  // Report lookup: free-text search plus type/device narrowing.
  const [reportSearch, setReportSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [deviceFilter, setDeviceFilter] = useState('ALL');

  useEffect(() => {
    loadReportsData();
  }, []);

  const loadReportsData = async () => {
    setLoadingReports(true);
    try {
      const [fetchedReports, fetchedAsms] = await Promise.all([
        api.getReports({ limit: 200 }).catch(() => []),
        api.getAssessments().catch(() => [])
      ]);
      setReports(fetchedReports || []);
      setAssessments(fetchedAsms || []);
      if (fetchedAsms && fetchedAsms.length > 0 && !selectedAsmId) {
        const firstCompleted = fetchedAsms.find(
          a => ['COMPLETED', 'PARTIALLY_COMPLETED'].includes((a.status || '').toUpperCase())
        );
        setSelectedAsmId(firstCompleted?.id || '');
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

  // Only completed scans can produce a certified report, so the generator lists
  // just those (the backend enforces the same rule).
  const completedAssessments = useMemo(
    () => assessments.filter(a => ['COMPLETED', 'PARTIALLY_COMPLETED'].includes((a.status || '').toUpperCase())),
    [assessments]
  );

  const visibleReports = useMemo(() => {
    const term = reportSearch.trim().toLowerCase();
    return reports.filter(rep => {
      if (typeFilter !== 'ALL' && rep.report_type !== typeFilter) return false;
      if (deviceFilter !== 'ALL' && rep.device_id !== deviceFilter) return false;
      if (!term) return true;
      return [rep.id, rep.title, rep.assessment_id, rep.device_id]
        .filter(Boolean)
        .some(field => String(field).toLowerCase().includes(term));
    });
  }, [reports, reportSearch, typeFilter, deviceFilter]);

  const hasActiveFilters = reportSearch.trim() !== '' || typeFilter !== 'ALL' || deviceFilter !== 'ALL';

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

        {/* Lookup toolbar: find a report by id, assessment, device or title */}
        <div className="px-4 py-3 border-b border-[#E5E7EB] bg-white flex flex-col sm:flex-row sm:items-center gap-2">
          <div className="relative flex-1 min-w-0">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
            <input
              type="text"
              value={reportSearch}
              onChange={(e) => setReportSearch(e.target.value)}
              placeholder="Find a report by ID, assessment (ASM-...), device or title..."
              aria-label="Search reports"
              className="w-full bg-[#FAFAFA] text-xs text-[#171717] placeholder-[#9CA3AF] pl-8 pr-8 py-2 rounded border border-[#E5E7EB] focus:border-[#1677FF] focus:outline-none focus:ring-1 focus:ring-[#1677FF]/20 font-mono transition-swiss"
            />
            {reportSearch && (
              <button
                onClick={() => setReportSearch('')}
                aria-label="Clear report search"
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded text-[#9CA3AF] hover:text-[#171717]"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              aria-label="Filter by report type"
              className="bg-[#FAFAFA] border border-[#E5E7EB] rounded px-2 py-2 text-xs font-mono text-[#171717] focus:outline-none"
            >
              <option value="ALL">All formats</option>
              <option value="PDF">PDF only</option>
              <option value="HTML">HTML only</option>
            </select>

            <select
              value={deviceFilter}
              onChange={(e) => setDeviceFilter(e.target.value)}
              aria-label="Filter by device"
              className="bg-[#FAFAFA] border border-[#E5E7EB] rounded px-2 py-2 text-xs font-mono text-[#171717] focus:outline-none max-w-[190px]"
            >
              <option value="ALL">All devices</option>
              {[...new Set(reports.map(r => r.device_id).filter(Boolean))].map(id => (
                <option key={id} value={id}>{id}</option>
              ))}
            </select>

            <span className="text-[11px] font-mono text-[#6B7280] whitespace-nowrap">
              {visibleReports.length} of {reports.length}
            </span>

            {hasActiveFilters && (
              <button
                onClick={() => { setReportSearch(''); setTypeFilter('ALL'); setDeviceFilter('ALL'); }}
                className="text-[11px] font-medium text-[#1677FF] hover:underline whitespace-nowrap"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {reports.length === 0 ? (
          <div className="py-12 px-6 text-center text-[#9CA3AF] text-xs font-mono leading-relaxed">
            {loadingReports
              ? 'Loading reports archive...'
              : 'No security reports yet. Reports are produced from a completed scan: register a device, run an assessment in Devices & Scan, then generate a PDF or HTML report here.'}
          </div>
        ) : visibleReports.length === 0 ? (
          <div className="py-12 px-6 text-center text-[#9CA3AF] text-xs font-mono">
            No reports match those filters.{' '}
            <button
              onClick={() => { setReportSearch(''); setTypeFilter('ALL'); setDeviceFilter('ALL'); }}
              className="text-[#1677FF] hover:underline"
            >
              Clear filters
            </button>
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
                {visibleReports.map((rep) => {
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
                        {formatDateTime(rep.created_at)}
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
              {completedAssessments.map(a => (
                <option key={a.id} value={a.id}>
                  {a.id} &bull; {a.device_id} &bull; Score: {a.security_score}/100 &bull; ({a.total_findings} findings)
                </option>
              ))}
            </select>
            {completedAssessments.length === 0 && (
              <p className="text-[11px] text-[#9CA3AF] mt-1.5">
                No completed scans yet. Run an assessment in Devices &amp; Scan first — a report can only certify a scan that finished.
              </p>
            )}
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
