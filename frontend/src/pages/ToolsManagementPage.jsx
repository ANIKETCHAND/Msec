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

export default function ToolsManagementPage() {
  const [tools, setTools] = useState([]);
  const [idsStatus, setIdsStatus] = useState({});
  const [loading, setLoading] = useState(false);
  const [lastChecked, setLastChecked] = useState(null);

  const toolDescriptions = {
    nmap: 'Network and medical service port auditor. Performs safe TCP connect discovery and HL7/Modbus service identification.',
    nuclei: 'Fast, template-based vulnerability scanner for known CVE signatures, default clinical web interfaces, and misconfigurations.',
    zap: 'OWASP Zed Attack Proxy API integration for passive web security auditing and clinical portal header evaluation.',
    nikto: 'Lightweight web server security scanner for HTTP misconfigurations and missing transport security headers.',
    openvas: 'Greenbone Vulnerability Management engine integration for institutional compliance checks.',
    suricata: 'High-performance passive Network Threat Detection and EVE JSON alert engine.',
    zeek: 'Powerful network flow analysis framework for connection duration and TLS anomaly detection.',
    tshark: 'Deep packet inspection and protocol frame frequency telemetry analysis.'
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const fetchStatus = async () => {
    setLoading(true);
    try {
      const [toolInv, ids] = await Promise.all([
        api.getToolInventory().catch(() => []),
        api.getIdsStatus().catch(() => ({}))
      ]);
      setTools(toolInv || []);
      setIdsStatus(ids || {});
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
          <p className="text-xs text-neutral-500 mt-1">
            Status of host assessment binaries and automatic synthetic clinical telemetry fallbacks.
          </p>
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
            <strong className="font-semibold text-neutral-900">DEFENSIVE EXECUTION POLICY:</strong> All tools execute parameterized, non-intrusive scans. When external binaries are absent on the host environment, MediShield utilizes realistic synthetic clinical telemetry fallback.
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
                        : 'bg-blue-50 text-blue-700 border-blue-200'
                    }`}>
                      {isAvail ? 'AVAILABLE' : 'SYNTHETIC FALLBACK'}
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
                      {isAvail ? 'Native Subprocess' : 'Synthetic IoMT Telemetry'}
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
