import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  Settings as SettingsIcon,
  Sliders,
  Shield,
  RefreshCw,
  Key,
  CheckCircle2,
  Info,
  Server,
  AlertCircle
} from 'lucide-react';

export default function SettingsPage() {
  const { resetAllSimulations, logAudit, currentUser } = useApp();

  const [authThreshold, setAuthThreshold] = useState(5);
  const [trafficThresholdMb, setTrafficThresholdMb] = useState(5.0);
  const [heartbeatTimeoutSec, setHeartbeatTimeoutSec] = useState(180);
  const [savedNotice, setSavedNotice] = useState(false);

  const handleSavePolicies = (e) => {
    e.preventDefault();
    logAudit('DETECTION_POLICY_UPDATE', 'DetectionEngine', 'POLICIES', `Updated thresholds: AuthFailures=${authThreshold}, TrafficSpike=${trafficThresholdMb}MB/s, HeartbeatTimeout=${heartbeatTimeoutSec}s.`);
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 3000);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div>
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          <SettingsIcon className="w-5 h-5 text-mediblue-400" />
          MediShield System & Detection Settings
        </h1>
        <p className="text-xs text-slate-400">
          Configure rule-based intrusion thresholds, review key management parameters, and manage prototype state.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Rule Thresholds Form */}
        <div className="bg-navy-900 border border-navy-800 rounded-2xl p-6 space-y-5 shadow-xl">
          <div className="flex items-center justify-between border-b border-navy-800 pb-3">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Sliders className="w-4 h-4 text-mediblue-400" />
              Intrusion Detection Thresholds (Rule Engine)
            </h2>
          </div>

          {savedNotice && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center gap-2 text-xs text-emerald-400 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4" />
              <span>Detection thresholds successfully updated and logged to audit trail.</span>
            </div>
          )}

          <form onSubmit={handleSavePolicies} className="space-y-4 text-xs">
            <div className="p-3.5 bg-navy-950 rounded-xl border border-navy-800 space-y-2">
              <div className="flex justify-between font-medium">
                <span className="text-slate-300">RULE-AUTH-002: Failed Login Trigger</span>
                <span className="font-mono text-mediblue-400 font-bold">{authThreshold} attempts</span>
              </div>
              <input
                type="range"
                min="2"
                max="15"
                step="1"
                value={authThreshold}
                onChange={(e) => setAuthThreshold(Number(e.target.value))}
                className="w-full accent-mediblue-500"
              />
              <p className="text-[11px] text-slate-400">
                Number of consecutive failed authentications within 60s before raising a High severity alert.
              </p>
            </div>

            <div className="p-3.5 bg-navy-950 rounded-xl border border-navy-800 space-y-2">
              <div className="flex justify-between font-medium">
                <span className="text-slate-300">RULE-NET-003: Bandwidth Anomaly Limit</span>
                <span className="font-mono text-mediblue-400 font-bold">{trafficThresholdMb} MB/s</span>
              </div>
              <input
                type="range"
                min="1.0"
                max="25.0"
                step="0.5"
                value={trafficThresholdMb}
                onChange={(e) => setTrafficThresholdMb(Number(e.target.value))}
                className="w-full accent-mediblue-500"
              />
              <p className="text-[11px] text-slate-400">
                Sustained outbound bandwidth surge threshold indicative of DoS or telemetry exfiltration.
              </p>
            </div>

            <div className="p-3.5 bg-navy-950 rounded-xl border border-navy-800 space-y-2">
              <div className="flex justify-between font-medium">
                <span className="text-slate-300">RULE-STAT-004: Heartbeat Disconnect Timeout</span>
                <span className="font-mono text-mediblue-400 font-bold">{heartbeatTimeoutSec} seconds</span>
              </div>
              <input
                type="range"
                min="30"
                max="600"
                step="15"
                value={heartbeatTimeoutSec}
                onChange={(e) => setHeartbeatTimeoutSec(Number(e.target.value))}
                className="w-full accent-mediblue-500"
              />
              <p className="text-[11px] text-slate-400">
                Maximum acceptable gap between telemetry pings before triggering Critical Device Offline alarm.
              </p>
            </div>

            {currentUser.role === 'Administrator' ? (
              <button
                type="submit"
                className="w-full py-2.5 bg-mediblue-600 hover:bg-mediblue-500 text-white rounded-xl text-xs font-semibold transition shadow-md shadow-mediblue-600/20"
              >
                Apply Threshold Modifications
              </button>
            ) : (
              <p className="text-[11px] text-slate-400 italic text-center">
                Administrator role required to commit policy updates.
              </p>
            )}
          </form>
        </div>

        {/* Right Column: Platform Environment & Reset */}
        <div className="space-y-6">
          <div className="bg-navy-900 border border-navy-800 rounded-2xl p-6 space-y-4 shadow-xl text-xs">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Server className="w-4 h-4 text-emerald-400" />
              Prototype Environment Variables
            </h2>

            <div className="space-y-2.5 font-mono text-[11px]">
              <div className="p-2.5 bg-navy-950 rounded-xl border border-navy-800 flex justify-between">
                <span className="text-slate-400">VITE_API_BASE_URL:</span>
                <span className="text-slate-200">http://127.0.0.1:8000</span>
              </div>
              <div className="p-2.5 bg-navy-950 rounded-xl border border-navy-800 flex justify-between">
                <span className="text-slate-400">ML_MODEL_PATH:</span>
                <span className="text-slate-200">ml/artifacts/iomt_rf_model.joblib</span>
              </div>
              <div className="p-2.5 bg-navy-950 rounded-xl border border-navy-800 flex justify-between">
                <span className="text-slate-400">AES_GCM_KEY_LEN:</span>
                <span className="text-emerald-400">256 bits (32 bytes)</span>
              </div>
            </div>
          </div>

          {/* Reset Baseline State Card */}
          <div className="bg-navy-900 border border-navy-800 rounded-2xl p-6 space-y-4 shadow-xl">
            <div className="flex items-center gap-2 text-white font-bold text-sm">
              <RefreshCw className="w-4 h-4 text-amber-400" />
              Reset Simulation State
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Restores simulated medical devices, events, incidents, and SHA-256 integrity records to their clean academic demonstration baseline.
            </p>

            <button
              onClick={resetAllSimulations}
              className="px-4 py-2 bg-navy-800 hover:bg-navy-700 text-slate-200 border border-navy-700 rounded-xl text-xs font-semibold flex items-center gap-2 transition"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Reset All In-Memory State
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
