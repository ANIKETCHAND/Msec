import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';
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
  const [errorMessage, setErrorMessage] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function loadPolicies() {
      try {
        const res = await api.getPolicies();
        if (res) {
          if (res.auth_failure_threshold) setAuthThreshold(res.auth_failure_threshold);
          if (res.packet_rate_dos_threshold) setTrafficThresholdMb(Math.round(res.packet_rate_dos_threshold / 120 * 10) / 10 || 5.0);
          if (res.heartbeat_timeout_sec) setHeartbeatTimeoutSec(res.heartbeat_timeout_sec);
        }
      } catch (e) {
        console.warn("Failed to load backend policies, using defaults:", e.message);
      }
    }
    loadPolicies();
  }, []);

  const handleSavePolicies = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage('');
    try {
      await api.updatePolicies({
        auth_failure_threshold: Number(authThreshold),
        packet_rate_dos_threshold: Number(trafficThresholdMb * 120),
        heartbeat_timeout_sec: Number(heartbeatTimeoutSec)
      });
      logAudit(
        'DETECTION_POLICY_UPDATE',
        'DetectionEngine',
        'POLICIES',
        `Updated backend thresholds: AuthFailures=${authThreshold}, TrafficSpike=${trafficThresholdMb}MB/s, HeartbeatTimeout=${heartbeatTimeoutSec}s.`
      );
      setSavedNotice(true);
      setTimeout(() => setSavedNotice(false), 3500);
    } catch (err) {
      setErrorMessage(err.message || 'Failed to update policies on server.');
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
              System Configuration & Policies
            </h1>
            <span className="text-[11px] font-mono font-medium px-2 py-0.5 rounded bg-neutral-100 text-neutral-600 border border-neutral-200">
              Platform Governance
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Rule Thresholds Form */}
        <div className="bg-white border border-neutral-200 rounded-lg p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-neutral-200">
            <h2 className="text-sm font-semibold text-neutral-900 flex items-center gap-2">
              <Sliders className="w-4 h-4 text-neutral-600" />
              Intrusion Detection Thresholds (Rule Engine)
            </h2>
          </div>

          {savedNotice && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded text-xs text-emerald-800 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Detection thresholds successfully updated and logged to audit trail.</span>
            </div>
          )}

          {errorMessage && (
            <div className="p-3 bg-red-50 border border-red-200 rounded text-xs text-red-800 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSavePolicies} className="space-y-4 text-xs">
            <div className="p-3.5 bg-neutral-50 rounded border border-neutral-200 space-y-2">
              <div className="flex justify-between font-medium">
                <span className="text-neutral-800">RULE-AUTH-002: Failed Login Trigger</span>
                <span className="font-mono text-neutral-900 font-semibold">{authThreshold} attempts</span>
              </div>
              <input
                type="range"
                min="2"
                max="15"
                step="1"
                value={authThreshold}
                onChange={(e) => setAuthThreshold(Number(e.target.value))}
                className="w-full accent-neutral-800"
              />
              <p className="text-[11px] text-neutral-500">
                Number of consecutive failed authentications within 60s before raising a High severity alert.
              </p>
            </div>

            <div className="p-3.5 bg-neutral-50 rounded border border-neutral-200 space-y-2">
              <div className="flex justify-between font-medium">
                <span className="text-neutral-800">RULE-NET-003: Bandwidth Anomaly Limit</span>
                <span className="font-mono text-neutral-900 font-semibold">{trafficThresholdMb} MB/s</span>
              </div>
              <input
                type="range"
                min="1.0"
                max="25.0"
                step="0.5"
                value={trafficThresholdMb}
                onChange={(e) => setTrafficThresholdMb(Number(e.target.value))}
                className="w-full accent-neutral-800"
              />
              <p className="text-[11px] text-neutral-500">
                Sustained outbound bandwidth surge threshold indicative of DoS or telemetry exfiltration.
              </p>
            </div>

            <div className="p-3.5 bg-neutral-50 rounded border border-neutral-200 space-y-2">
              <div className="flex justify-between font-medium">
                <span className="text-neutral-800">RULE-STAT-004: Heartbeat Disconnect Timeout</span>
                <span className="font-mono text-neutral-900 font-semibold">{heartbeatTimeoutSec} seconds</span>
              </div>
              <input
                type="range"
                min="30"
                max="600"
                step="15"
                value={heartbeatTimeoutSec}
                onChange={(e) => setHeartbeatTimeoutSec(Number(e.target.value))}
                className="w-full accent-neutral-800"
              />
              <p className="text-[11px] text-neutral-500">
                Maximum acceptable gap between telemetry pings before triggering Critical Device Offline alarm.
              </p>
            </div>

            {currentUser.role === 'Administrator' ? (
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2 bg-neutral-900 hover:bg-black disabled:opacity-50 text-white rounded text-xs font-medium transition-swiss"
              >
                {loading ? 'Applying Changes...' : 'Apply Threshold Modifications'}
              </button>
            ) : (
              <p className="text-[11px] text-neutral-500 italic text-center">
                Administrator role required to commit policy updates.
              </p>
            )}
          </form>
        </div>

        {/* Right Column: Platform Environment & Reset */}
        <div className="space-y-6">
          <div className="bg-white border border-neutral-200 rounded-lg p-5 space-y-3.5 text-xs">
            <h2 className="text-sm font-semibold text-neutral-900 flex items-center gap-2">
              <Server className="w-4 h-4 text-neutral-600" />
              Runtime Environment Variables
            </h2>

            <div className="space-y-2 font-mono text-[11px]">
              <div className="p-2.5 bg-neutral-50 rounded border border-neutral-200 flex justify-between items-center">
                <span className="text-neutral-500">VITE_API_BASE_URL:</span>
                <span className="text-neutral-900 font-medium">http://127.0.0.1:8000</span>
              </div>
              <div className="p-2.5 bg-neutral-50 rounded border border-neutral-200 flex justify-between items-center">
                <span className="text-neutral-500">ML_MODEL_PATH:</span>
                <span className="text-neutral-900 font-medium">ml/artifacts/iomt_rf_model.joblib</span>
              </div>
              <div className="p-2.5 bg-neutral-50 rounded border border-neutral-200 flex justify-between items-center">
                <span className="text-neutral-500">AES_GCM_KEY_LEN:</span>
                <span className="text-emerald-700 font-medium">256 bits (32 bytes)</span>
              </div>
            </div>
          </div>

          {/* Reset Baseline State Card */}
          <div className="bg-white border border-neutral-200 rounded-lg p-5 space-y-3">
            <div className="flex items-center gap-2 text-neutral-900 font-semibold text-sm">
              <RefreshCw className="w-4 h-4 text-neutral-600" />
              Reset Demonstration State
            </div>
            <p className="text-xs text-neutral-500 leading-relaxed">
              Restores simulated medical devices, events, incidents, and SHA-256 integrity records to their clean academic demonstration baseline.
            </p>

            <button
              onClick={resetAllSimulations}
              className="px-3.5 py-1.5 bg-white hover:bg-neutral-50 text-neutral-700 border border-neutral-300 rounded text-xs font-medium flex items-center gap-2 transition-swiss"
            >
              <RefreshCw className="w-3.5 h-3.5 text-neutral-500" />
              Reset All In-Memory State
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
