import React, { useState, useEffect } from 'react';
import { ShieldCheck, Activity, Server, Database, Brain, Cpu, CheckCircle2, AlertTriangle, ArrowRight } from 'lucide-react';

export default function App() {
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchHealth = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/health');
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      const data = await res.json();
      setHealth(data);
    } catch (err) {
      console.error('Failed to query health endpoint:', err);
      setError(err.message || 'Failed to reach MediShield API');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
  }, []);

  return (
    <div className="min-h-screen bg-navy-950 text-slate-100 flex flex-col justify-between p-6 md:p-12 font-sans">
      <header className="max-w-6xl mx-auto w-full flex items-center justify-between border-b border-navy-800 pb-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-mediblue-500/10 border border-mediblue-500/30 rounded-xl">
            <ShieldCheck className="w-8 h-8 text-mediblue-500" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              MediShield
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-mediblue-500/20 text-mediblue-500 border border-mediblue-500/30">
                Phase 1 Active
              </span>
            </h1>
            <p className="text-xs text-slate-400">IoMT Security & Privacy Platform • Academic Research Prototype</p>
          </div>
        </div>
        <div className="hidden sm:flex items-center gap-3">
          <button
            onClick={fetchHealth}
            className="text-xs bg-navy-800 hover:bg-navy-700 text-slate-200 border border-navy-700 px-3 py-1.5 rounded-lg flex items-center gap-2 transition"
          >
            <Activity className="w-3.5 h-3.5 text-mediblue-500" />
            Ping Health Check
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto w-full my-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: System Status */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-navy-900 border border-navy-800 rounded-2xl p-6 shadow-xl">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-4 flex items-center gap-2">
              <Server className="w-4 h-4 text-mediblue-500" />
              API Operational Status
            </h2>

            {loading ? (
              <div className="animate-pulse space-y-3">
                <div className="h-6 bg-navy-800 rounded w-1/2"></div>
                <div className="h-4 bg-navy-800 rounded w-3/4"></div>
                <div className="h-20 bg-navy-800 rounded"></div>
              </div>
            ) : error ? (
              <div className="p-4 bg-medidanger-500/10 border border-medidanger-500/30 rounded-xl text-medidanger-500 space-y-2">
                <div className="flex items-center gap-2 font-semibold text-sm">
                  <AlertTriangle className="w-4 h-4" />
                  Backend Connection Issue
                </div>
                <p className="text-xs text-slate-300">{error}</p>
                <button
                  onClick={fetchHealth}
                  className="mt-2 text-xs bg-navy-800 hover:bg-navy-700 px-2.5 py-1 rounded text-white"
                >
                  Retry Connection
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-navy-800/60 rounded-xl border border-navy-700">
                  <span className="text-xs text-slate-300">Status</span>
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {health?.status}
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 bg-navy-800/60 rounded-xl border border-navy-700">
                  <span className="text-xs text-slate-300">Environment</span>
                  <span className="text-xs font-mono text-slate-200">{health?.environment}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-navy-800/60 rounded-xl border border-navy-700">
                  <span className="text-xs text-slate-300">Backend Version</span>
                  <span className="text-xs font-mono text-slate-200">v{health?.version}</span>
                </div>

                <div className="pt-2">
                  <p className="text-xs font-medium text-slate-400 mb-2">Subsystem Services:</p>
                  <div className="space-y-1.5 text-xs">
                    {health?.services &&
                      Object.entries(health.services).map(([name, status]) => (
                        <div key={name} className="flex justify-between items-center text-slate-400 font-mono py-1 px-2 rounded bg-navy-950/40">
                          <span className="capitalize">{name.replace('_', ' ')}</span>
                          <span className="text-slate-300">{String(status)}</span>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="bg-navy-900 border border-navy-800 rounded-2xl p-6 shadow-xl text-xs space-y-3">
            <h3 className="font-semibold text-slate-300">Prototype Scope Notice</h3>
            <p className="text-slate-400 leading-relaxed">
              MediShield is an academic research prototype demonstrating IoMT intrusion detection, authentication,
              authenticated encryption (AES-GCM), and SHA-256 integrity verification. All device signals and records are synthetic.
            </p>
          </div>
        </div>

        {/* Right Column: Architecture & Phase Blueprint */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-navy-900 border border-navy-800 rounded-2xl p-6 shadow-xl">
            <h2 className="text-lg font-bold text-white mb-2">MediShield System Architecture</h2>
            <p className="text-xs text-slate-400 mb-6">
              A 4-tier modular architecture structured for robust IoMT monitoring, explainable detection, and cryptographic integrity.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-navy-800/50 border border-navy-700">
                <div className="flex items-center gap-2 mb-2 text-mediblue-500 font-semibold text-sm">
                  <Cpu className="w-4 h-4" />
                  Frontend Dashboard
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  React 18 + Vite + Tailwind CSS. Provides IoMT security event streams, device telemetry graphs, topology maps, and incident review workflows.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-navy-800/50 border border-navy-700">
                <div className="flex items-center gap-2 mb-2 text-emerald-400 font-semibold text-sm">
                  <Server className="w-4 h-4" />
                  FastAPI Backend Core
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  High-performance asynchronous REST API. Orchestrates rule-based intrusion checks, RBAC token verification, audit trails, and AES-GCM cryptography.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-navy-800/50 border border-navy-700">
                <div className="flex items-center gap-2 mb-2 text-purple-400 font-semibold text-sm">
                  <Database className="w-4 h-4" />
                  PostgreSQL / Supabase
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Relational persistence for synthetic devices, telemetry logs, security events, audit logs, and SHA-256 data integrity hashes.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-navy-800/50 border border-navy-700">
                <div className="flex items-center gap-2 mb-2 text-amber-400 font-semibold text-sm">
                  <Brain className="w-4 h-4" />
                  CICIoMT2024 ML Engine
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Trained machine learning models (Random Forest classifier) for IoMT attack pattern identification with honest confidence scoring and leakage controls.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-navy-900 border border-navy-800 rounded-2xl p-6 shadow-xl">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-3">
              Phase 1 Deliverables & Execution Status
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="flex items-center gap-2 text-slate-300">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>React + Vite + Tailwind configured</span>
              </div>
              <div className="flex items-center gap-2 text-slate-300">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>FastAPI backend initialized</span>
              </div>
              <div className="flex items-center gap-2 text-slate-300">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Health endpoint <code className="text-mediblue-500 font-mono">/api/health</code> active</span>
              </div>
              <div className="flex items-center gap-2 text-slate-300">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Environment templates & .gitignore created</span>
              </div>
              <div className="flex items-center gap-2 text-slate-300">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Modular repository structure scaffolded</span>
              </div>
              <div className="flex items-center gap-2 text-slate-300">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Complete architectural & API docs prepared</span>
              </div>
            </div>

            <div className="mt-5 pt-4 border-t border-navy-800 flex items-center justify-between text-xs text-slate-400">
              <span>Next Phase: <strong>Phase 2 — Frontend Design & Dashboard</strong></span>
              <span className="flex items-center gap-1 text-mediblue-500 font-semibold">
                Awaiting Phase 1 Approval <ArrowRight className="w-3.5 h-3.5" />
              </span>
            </div>
          </div>
        </div>
      </main>

      <footer className="max-w-6xl mx-auto w-full text-center text-xs text-slate-400 border-t border-navy-800 pt-6">
        MediShield Prototype • Designed for IoMT Security & Privacy Research • Phase 1 Foundation
      </footer>
    </div>
  );
}
