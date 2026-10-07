import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import {
  Wrench,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Terminal,
  ShieldCheck,
  ShieldAlert,
  Server,
  Layers,
  Cpu,
  Radio,
  ExternalLink
} from 'lucide-react';

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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              <Wrench className="w-5 h-5 text-mediblue-400" />
              Defensive Security Tools & Scanners
            </h1>
            <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-mediblue-500/10 text-mediblue-400 border border-mediblue-500/30">
              Integrations Management
            </span>
          </div>
          <p className="text-xs text-slate-400">
            System status of host-installed assessment binaries and automatic synthetic fallback adapters.
          </p>
        </div>

        <button
          onClick={fetchStatus}
          disabled={loading}
          className="px-3.5 py-2 bg-navy-800 hover:bg-navy-700 text-slate-200 rounded-xl text-xs font-semibold flex items-center gap-2 border border-navy-700 transition"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Probe Tool Availability
        </button>
      </div>

      {/* Safety Notice */}
      <div className="p-3.5 bg-navy-900 border border-navy-700/80 rounded-2xl flex items-center justify-between text-xs text-slate-300">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <span>
            <strong className="text-emerald-400">DEFENSIVE EXECUTION POLICY:</strong> All tools execute parameterized non-intrusive scans. When external binaries are absent on the host environment, MediShield utilizes realistic synthetic clinical telemetry fallback.
          </span>
        </div>
        {lastChecked && (
          <span className="text-[10px] font-mono text-slate-400 hidden md:inline">
            Checked: {lastChecked}
          </span>
        )}
      </div>

      {/* Tools Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {tools.map(tool => {
          const isAvail = tool.available;
          return (
            <div
              key={tool.name}
              className="bg-navy-900 border border-navy-800 rounded-2xl p-5 space-y-4 hover:border-navy-700 transition shadow-xl flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-navy-950 rounded-xl border border-navy-800">
                      <Terminal className="w-4 h-4 text-mediblue-400" />
                    </div>
                    <div>
                      <h3 className="font-bold text-white text-sm capitalize">{tool.name}</h3>
                      <span className="text-[10px] font-mono text-slate-400">v{tool.version}</span>
                    </div>
                  </div>

                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${
                    isAvail
                      ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                      : 'bg-blue-500/20 text-blue-400 border-blue-500/30'
                  }`}>
                    {isAvail ? 'AVAILABLE' : 'SIMULATED FALLBACK'}
                  </span>
                </div>

                <p className="text-xs text-slate-400 leading-relaxed">
                  {toolDescriptions[tool.name] || 'Defensive security assessment tool integration.'}
                </p>
              </div>

              <div className="pt-3 border-t border-navy-800/80 space-y-2 text-[11px]">
                <div className="flex items-center justify-between text-slate-400">
                  <span>Execution Mode:</span>
                  <span className="font-mono text-slate-200">
                    {isAvail ? 'Native Subprocess' : 'Synthetic IoMT Telemetry'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-slate-400">
                  <span>Binary Path / Socket:</span>
                  <span className="font-mono text-slate-400 truncate max-w-[150px]" title={tool.path || 'Auto-fallback'}>
                    {tool.path || 'Simulated Engine'}
                  </span>
                </div>
              </div>
            </div>
          );
        })}

        {/* Passive IDS Tools from idsStatus */}
        {Object.entries(idsStatus).map(([name, info]) => (
          <div
            key={name}
            className="bg-navy-900 border border-navy-800 rounded-2xl p-5 space-y-4 hover:border-navy-700 transition shadow-xl flex flex-col justify-between"
          >
            <div className="space-y-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-navy-950 rounded-xl border border-navy-800">
                    <Radio className="w-4 h-4 text-amber-400" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-sm capitalize">{name}</h3>
                    <span className="text-[10px] font-mono text-slate-400">Passive IDS Sensor</span>
                  </div>
                </div>

                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${
                  info.installed
                    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                    : 'bg-blue-500/20 text-blue-400 border-blue-500/30'
                }`}>
                  {info.installed ? 'AVAILABLE' : 'SIMULATED FALLBACK'}
                </span>
              </div>

              <p className="text-xs text-slate-400 leading-relaxed">
                {toolDescriptions[name] || 'Passive traffic monitoring and protocol analysis.'}
              </p>
            </div>

            <div className="pt-3 border-t border-navy-800/80 space-y-2 text-[11px]">
              <div className="flex items-center justify-between text-slate-400">
                <span>Sensor Mode:</span>
                <span className="font-mono text-slate-200">
                  {info.installed ? 'Live Pcap Ingestion' : 'Synthetic EVE Feed'}
                </span>
              </div>
              <div className="flex items-center justify-between text-slate-400">
                <span>System Path:</span>
                <span className="font-mono text-slate-400 truncate max-w-[150px]">
                  {info.path || 'In-Memory Stream'}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
