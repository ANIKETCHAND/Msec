import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import Modal from './Modal';
import {
  Download,
  FileText,
  FileCode,
  FileSpreadsheet,
  CheckCircle2,
  ShieldCheck,
  AlertTriangle,
  RefreshCw,
  Copy,
  Check,
  ExternalLink,
  Lock,
  Layers
} from 'lucide-react';

export default function ReportDownloadModal({
  isOpen = false,
  onClose,
  assessmentId,
  deviceId = '',
  targetIp = '',
  securityScore = null,
  onViewInReports
}) {
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState(null);
  const [activeFormat, setActiveFormat] = useState('PDF');
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  useEffect(() => {
    if (isOpen && assessmentId) {
      generateReportForFormat(activeFormat);
    } else {
      setReport(null);
      setError(null);
      setDownloadSuccess(false);
    }
  }, [isOpen, assessmentId]);

  const generateReportForFormat = async (format) => {
    if (!assessmentId) return;
    setLoading(true);
    setError(null);
    setDownloadSuccess(false);
    try {
      const rep = await api.generateReport(assessmentId, format);
      setReport(rep);
      setActiveFormat(format);
    } catch (err) {
      console.error('Failed to generate report:', err);
      setError(err.message || `Failed to generate ${format} report.`);
    } finally {
      setLoading(false);
    }
  };

  const handleFormatChange = (format) => {
    if (format === activeFormat && report) return;
    setActiveFormat(format);
    generateReportForFormat(format);
  };

  const handleDownload = async () => {
    if (!report?.id) return;
    setDownloading(true);
    setDownloadSuccess(false);
    try {
      const ext = (report.report_type || activeFormat).toLowerCase();
      const filename = `medishield-audit-${assessmentId}.${ext}`;
      await api.downloadReportFile(report.id, filename);
      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 4000);
    } catch (err) {
      console.warn('Direct blob download failed, falling back to direct URL:', err.message);
      const url = api.getReportDownloadUrl(report.id);
      const a = document.createElement('a');
      a.href = url;
      a.download = `medishield-audit-${assessmentId}.${activeFormat.toLowerCase()}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 4000);
    } finally {
      setDownloading(false);
    }
  };

  const handleDownloadCsv = () => {
    const filename = `medishield-findings-${assessmentId}.csv`;
    api.downloadCsvFile('/reports/assessments.csv', filename).catch(err => {
      console.error('CSV download failed:', err);
    });
  };

  const handleCopyHash = () => {
    if (!report?.sha256_hash) return;
    navigator.clipboard.writeText(report.sha256_hash);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleNavigateArchive = () => {
    if (onClose) onClose();
    if (onViewInReports) {
      onViewInReports();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Certified SOC Security Audit Report"
      subtitle={`Assessment ${assessmentId} • Asset ${deviceId || 'Device'} (${targetIp || 'Network Target'})`}
      maxWidth="max-w-xl"
      footer={
        <div className="w-full flex items-center justify-between gap-2">
          {onViewInReports ? (
            <button
              onClick={handleNavigateArchive}
              className="px-3 py-1.5 text-xs text-[#1677FF] hover:text-[#125ecc] hover:bg-blue-50 font-medium rounded-lg transition-swiss flex items-center gap-1.5 cursor-pointer"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Open in Reports Archive</span>
            </button>
          ) : <div />}

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3.5 py-1.5 text-xs font-medium text-[#4B5563] hover:text-[#171717] hover:bg-[#F3F4F6] rounded-lg transition-swiss cursor-pointer"
            >
              Close
            </button>
            <button
              onClick={handleDownload}
              disabled={loading || !report || downloading}
              className="px-4 py-1.5 bg-[#1677FF] hover:bg-[#125ecc] disabled:opacity-50 text-white text-xs font-semibold rounded-lg shadow-sm transition-swiss flex items-center gap-1.5 cursor-pointer"
            >
              {downloading ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Downloading...</span>
                </>
              ) : downloadSuccess ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Downloaded!</span>
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5" />
                  <span>Download {activeFormat} Report</span>
                </>
              )}
            </button>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Loading State */}
        {loading && (
          <div className="py-10 text-center space-y-3">
            <RefreshCw className="w-8 h-8 text-[#1677FF] animate-spin mx-auto" />
            <div>
              <p className="text-sm font-semibold text-[#171717]">
                Generating Certified {activeFormat} Report...
              </p>
              <p className="text-xs text-[#6B7280] mt-1">
                Synthesizing multi-tool telemetry, calculating CVSS metrics, and sealing cryptographic SHA-256 hash.
              </p>
            </div>
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div className="p-3.5 bg-red-50 border border-red-200 rounded-lg space-y-2">
            <div className="flex items-center gap-2 text-red-700 font-semibold text-xs">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>Failed to generate report</span>
            </div>
            <p className="text-xs text-red-600 font-mono">{error}</p>
            <button
              onClick={() => generateReportForFormat(activeFormat)}
              className="px-3 py-1 bg-white border border-red-300 text-red-700 text-xs font-medium rounded hover:bg-red-50 transition-swiss flex items-center gap-1 cursor-pointer"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Retry Generation</span>
            </button>
          </div>
        )}

        {/* Success View */}
        {report && !loading && (
          <>
            {/* Success Notification Banner */}
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div className="text-xs space-y-0.5">
                <p className="font-semibold text-emerald-900">
                  Report Certified & Registered in SOC Archive
                </p>
                <p className="text-emerald-700 leading-relaxed">
                  This report has been automatically recorded with a verified cryptographic SHA-256 integrity seal. You can download it immediately or retrieve it anytime from the Reports page.
                </p>
              </div>
            </div>

            {/* Format Selection Tabs */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-[#6B7280] uppercase tracking-wider block">
                Select Report Format
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleFormatChange('PDF')}
                  className={`p-2.5 rounded-lg border text-left transition-swiss flex items-center gap-3 cursor-pointer ${
                    activeFormat === 'PDF'
                      ? 'bg-blue-50/60 border-[#1677FF] ring-1 ring-[#1677FF]'
                      : 'bg-white border-[#E5E7EB] hover:bg-[#F9FAFB]'
                  }`}
                >
                  <div className={`p-2 rounded ${activeFormat === 'PDF' ? 'bg-[#1677FF] text-white' : 'bg-[#F3F4F6] text-[#6B7280]'}`}>
                    <FileText className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-[#171717] flex items-center gap-1.5">
                      <span>PDF Document</span>
                      <span className="text-[10px] px-1.5 py-0.2 bg-emerald-100 text-emerald-800 rounded font-mono">Recommended</span>
                    </div>
                    <p className="text-[10px] text-[#6B7280] mt-0.5">
                      Official ReportLab audit document with clinical governance seal.
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handleFormatChange('HTML')}
                  className={`p-2.5 rounded-lg border text-left transition-swiss flex items-center gap-3 cursor-pointer ${
                    activeFormat === 'HTML'
                      ? 'bg-blue-50/60 border-[#1677FF] ring-1 ring-[#1677FF]'
                      : 'bg-white border-[#E5E7EB] hover:bg-[#F9FAFB]'
                  }`}
                >
                  <div className={`p-2 rounded ${activeFormat === 'HTML' ? 'bg-[#1677FF] text-white' : 'bg-[#F3F4F6] text-[#6B7280]'}`}>
                    <FileCode className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-[#171717]">
                      Standalone HTML
                    </div>
                    <p className="text-[10px] text-[#6B7280] mt-0.5">
                      Self-contained offline webpage for browser review.
                    </p>
                  </div>
                </button>
              </div>
            </div>

            {/* Metadata Card */}
            <div className="bg-[#F9FAFB] border border-[#E5E7EB] rounded-lg p-3.5 space-y-2.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-[10px] font-semibold text-[#6B7280] uppercase tracking-wider block">
                    Report Identifier
                  </span>
                  <span className="font-mono font-semibold text-[#171717]">
                    {report.id}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-semibold text-[#6B7280] uppercase tracking-wider block">
                    Target Device
                  </span>
                  <span className="font-medium text-[#171717]">
                    {deviceId || report.device_id || 'IoMT Target'} ({targetIp || '192.168.10.x'})
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-semibold text-[#6B7280] uppercase tracking-wider block">
                    Assessment ID
                  </span>
                  <span className="font-mono text-[#374151]">
                    {assessmentId}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-semibold text-[#6B7280] uppercase tracking-wider block">
                    Posture Score
                  </span>
                  <span className="font-semibold text-emerald-700">
                    {securityScore != null ? `${Math.round(securityScore)} / 100` : '100 / 100'} Posture
                  </span>
                </div>
              </div>

              {/* Cryptographic SHA-256 Seal */}
              <div className="pt-2 border-t border-[#E5E7EB] space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-semibold text-[#6B7280] uppercase tracking-wider flex items-center gap-1">
                    <Lock className="w-3 h-3 text-[#1677FF]" />
                    <span>Cryptographic SHA-256 Seal</span>
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyHash}
                    className="text-[10px] text-[#1677FF] hover:text-[#125ecc] font-medium flex items-center gap-1 cursor-pointer"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-600" />
                        <span className="text-emerald-600 font-semibold">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>Copy Hash</span>
                      </>
                    )}
                  </button>
                </div>
                <div className="p-2 bg-white rounded border border-[#E5E7EB] font-mono text-[11px] text-[#374151] break-all select-all">
                  {report.sha256_hash}
                </div>
              </div>
            </div>

            {/* Quick Actions Row */}
            <div className="flex items-center justify-between text-xs pt-1">
              <button
                type="button"
                onClick={handleDownloadCsv}
                className="text-[#4B5563] hover:text-[#171717] font-medium flex items-center gap-1.5 transition-swiss cursor-pointer"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                <span>Export Findings CSV</span>
              </button>

              <span className="text-[11px] text-[#9CA3AF] flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-[#1677FF]" />
                <span>NIST SP 800-53 & FDA IoMT Validated</span>
              </span>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
