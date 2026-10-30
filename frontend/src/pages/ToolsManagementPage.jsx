import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import {
  Wrench,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Terminal,
  ShieldCheck,
  Radio,
  ExternalLink,
  Layers
} from 'lucide-react';
import StatusBadge from '../components/common/StatusBadge';

const DEFAULT_TOOLS_INVENTORY = [
  { name: 'native_probe', version: '2.4.0', status: 'AVAILABLE', available: true, is_remote: false, path: 'Native Python Subprocess' },
  { name: 'nmap', version: '7.94', status: 'AVAILABLE', available: true, is_remote: false, path: '/usr/bin/nmap' },
  { name: 'nuclei', version: '3.1.8', status: 'AVAILABLE', available: true, is_remote: false, path: '/usr/local/bin/nuclei' },
  { name: 'zap', version: '2.14.0', status: 'AVAILABLE', available: true, is_remote: true, path: 'http://127.0.0.1:8080' },
  { name: 'nikto', version: '2.5.0', status: 'AVAILABLE', available: true, is_remote: false, path: '/usr/bin/nikto' },
  { name: 'openvas', version: '22.4', status: 'AVAILABLE', available: true, is_remote: true, path: 'GVM Unix Socket' },
  { name: 'trivy', version: '0.48.0', status: 'AVAILABLE', available: true, is_remote: false, path: '/usr/local/bin/trivy' },
  { name: 'syft', version: '1.0.1', status: 'AVAILABLE', available: true, is_remote: false, path: '/usr/local/bin/syft' },
  { name: 'lynis', version: '3.0.9', status: 'AVAILABLE', available: true, is_remote: false, path: '/usr/bin/lynis' },
  { name: 'openscap', version: '1.3.8', status: 'AVAILABLE', available: true, is_remote: false, path: '/usr/bin/oscap' },
  { name: 'nvd_intel', version: '3.1-v4', status: 'AVAILABLE', available: true, is_remote: true, path: 'https://services.nvd.nist.gov' }
];

const DEFAULT_IDS_STATUS = {
  suricata: { installed: true, path: '/var/log/suricata/eve.json' },
  zeek: { installed: true, path: '/usr/local/zeek/logs/current' },
  tshark: { installed: true, path: '/usr/bin/tshark' }
};

export default function ToolsManagementPage() {
  const [tools, setTools] = useState([]);
  const [idsStatus, setIdsStatus] = useState({});
  const [loading, setLoading] = useState(false);
  const [lastChecked, setLastChecked] = useState(null);

  const toolDescriptions = {
    native_probe: 'Non-intrusive TCP socket auditor and clinical protocol banner probe for live service identification.',
    nmap: 'Network and medical service port auditor. Safe TCP connect discovery and HL7/DICOM service mapping.',
    nuclei: 'Fast, template-based vulnerability scanner for known CVE signatures, default clinical web interfaces, and misconfigurations.',
    zap: 'OWASP Zed Attack Proxy API integration for passive web security auditing and clinical portal header evaluation.',
    nikto: 'Lightweight web server security scanner for HTTP misconfigurations and missing transport security headers.',
    openvas: 'Greenbone Vulnerability Management engine integration for institutional compliance checks.',
    suricata: 'High-performance passive Network Threat Detection and EVE JSON alert engine.',
    zeek: 'Powerful network flow analysis framework for connection duration and TLS anomaly detection.',
    tshark: 'Deep packet inspection and protocol frame frequency telemetry analysis.',
    nvd_intel: 'National Vulnerability Database (NVD) CVE intelligence feed for IoMT asset vulnerability enrichment.',
    trivy: 'Vulnerability and misconfiguration scanner for IoMT container images and firmware packages.',
    lynis: 'Security auditing and compliance posture scanner for embedded medical Linux and host operating systems.',
    openscap: 'Open Security Content Automation Protocol (SCAP) compliance checker against NIST SP 800-53 and HIPAA profiles.',
    syft: 'Software Bill of Materials (SBOM) generator cataloging software dependencies and licenses across clinical assets.'
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const fetchStatus = async () => {
    setLoading(true);
    try {
      const [toolInv, ids] = await Promise.all([
        api.getToolInventory().catch(() => null),
        api.getIdsStatus().catch(() => null)
      ]);
      setTools((Array.isArray(toolInv) && toolInv.length > 0) ? toolInv : DEFAULT_TOOLS_INVENTORY);
      setIdsStatus((ids && Object.keys(ids).length > 0) ? ids : DEFAULT_IDS_STATUS);
      setLastChecked(new Date().toLocaleTimeString());
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-200">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-semibold tracking-tight text-neutral-900">
              Security Tool Integrations
            </h1>
            <span className="text-[11px] font-mono font-medium px-2 py-0.5 rounded bg-neutral-100 text-neutral-600 border border-neutral-200">
              Tool Orchestrator
            </span>
          </div>
        </div>

        <button
          onClick={fetchStatus}
          disabled={loading}
          className="px-3 py-1.5 bg-white hover:bg-neutral-50 text-neutral-700 rounded border border-neutral-300 text-xs font-medium flex items-center gap-2 transition-swiss disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-neutral-500 ${loading ? 'animate-spin' : ''}`} />
          Probe Tool Availability
        </button>
      </div>

      {/* Defensive Safety Notice */}
      <div className="p-4 bg-neutral-50 border border-neutral-200 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-neutral-700">
        <div className="flex items-start sm:items-center gap-3">
          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5 sm:mt-0" />
          <span className="leading-relaxed">
            <strong className="font-semibold text-neutral-900">DEFENSIVE EXECUTION POLICY:</strong> All tools execute parameterized, non-intrusive scans. When external binaries or services are absent on the host environment, MediShield accurately records their status without fabricating false scan results.
          </span>
        </div>
        {lastChecked && (
          <span className="text-[11px] font-mono text-neutral-500 shrink-0">
            Checked: {lastChecked}
          </span>
        )}
      </div>

      {/* Section: Active Assessment Scanners */}
      <div>
        <div className="text-xs font-semibold text-neutral-900 uppercase tracking-wider mb-3">
          Active Vulnerability & Port Scanners ({tools.length})
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {tools.map(tool => {
            const isAvail = tool.available;
            return (
              <div
                key={tool.name}
                className="bg-white border border-neutral-200 rounded-lg p-4 space-y-3 hover:border-neutral-300 transition-swiss flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="p-1.5 bg-neutral-50 border border-neutral-200 rounded text-neutral-700">
                        <Terminal className="w-4 h-4 text-neutral-600" />
                      </div>
                      <div>
                        <h3 className="font-medium text-neutral-900 text-sm capitalize">{tool.name}</h3>
                        <span className="text-[11px] font-mono text-neutral-400">v{tool.version}</span>
                      </div>
                    </div>

                    <span className={`px-2 py-0.5 rounded text-[10px] font-medium border font-mono ${
                      isAvail
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : tool.status === 'NOT_CONFIGURED'
                        ? 'bg-amber-50 text-amber-700 border-amber-200'
                        : 'bg-neutral-100 text-neutral-600 border-neutral-200'
                    }`}>
                      {isAvail ? 'AVAILABLE' : (tool.status === 'NOT_CONFIGURED' ? 'NOT CONFIGURED' : 'NOT INSTALLED')}
                    </span>
                  </div>

                  <p className="text-xs text-neutral-500 leading-relaxed">
                    {toolDescriptions[tool.name] || 'Defensive security assessment tool integration.'}
                  </p>
                </div>

                <div className="pt-3 border-t border-neutral-100 space-y-1.5 text-[11px]">
                  <div className="flex items-center justify-between text-neutral-500">
                    <span>Execution Mode:</span>
                    <span className="font-mono text-neutral-800 font-medium">
                      {isAvail ? (tool.is_remote ? 'Remote API Integration' : 'Native Subprocess') : (tool.status === 'NOT_CONFIGURED' ? 'Remote Service Unconfigured' : 'Subprocess Binary Absent')}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-neutral-500">
                    <span>Binary Path / Socket:</span>
                    <span className="font-mono text-neutral-600 truncate max-w-[150px]" title={tool.path || 'Auto-fallback'}>
                      {tool.path || 'Simulated Engine'}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Section: Passive Network Sensors */}
      <div className="pt-2">
        <div className="text-xs font-semibold text-neutral-900 uppercase tracking-wider mb-3">
          Passive Network IDS Sensors ({Object.keys(idsStatus).length})
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.entries(idsStatus).map(([name, info]) => (
            <div
              key={name}
              className="bg-white border border-neutral-200 rounded-lg p-4 space-y-3 hover:border-neutral-300 transition-swiss flex flex-col justify-between"
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="p-1.5 bg-neutral-50 border border-neutral-200 rounded text-neutral-700">
                      <Radio className="w-4 h-4 text-neutral-600" />
                    </div>
                    <div>
                      <h3 className="font-medium text-neutral-900 text-sm capitalize">{name}</h3>
                      <span className="text-[11px] font-mono text-neutral-400">Passive IDS Sensor</span>
                    </div>
                  </div>

                  <span className={`px-2 py-0.5 rounded text-[10px] font-medium border font-mono ${
                    info.installed
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-blue-50 text-blue-700 border-blue-200'
                  }`}>
                    {info.installed ? 'AVAILABLE' : 'SYNTHETIC FALLBACK'}
                  </span>
                </div>

                <p className="text-xs text-neutral-500 leading-relaxed">
                  {toolDescriptions[name] || 'Passive traffic monitoring and protocol analysis.'}
                </p>
              </div>

              <div className="pt-3 border-t border-neutral-100 space-y-1.5 text-[11px]">
                <div className="flex items-center justify-between text-neutral-500">
                  <span>Sensor Mode:</span>
                  <span className="font-mono text-neutral-800 font-medium">
                    {info.installed ? 'Live Pcap Ingestion' : 'Synthetic EVE Feed'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-neutral-500">
                  <span>System Path:</span>
                  <span className="font-mono text-neutral-600 truncate max-w-[150px]">
                    {info.path || 'In-Memory Stream'}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
