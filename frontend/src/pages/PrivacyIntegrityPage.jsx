import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  Lock,
  ShieldCheck,
  ShieldAlert,
  Key,
  FileCheck2,
  RefreshCw,
  AlertTriangle,
  Code2,
  CheckCircle2,
  Info,
  Unlock,
  Layers
} from 'lucide-react';
import StatusBadge from '../components/common/StatusBadge';

export default function PrivacyIntegrityPage() {
  const { integrityRecords, tamperRecord, recomputeAndVerify, currentUser } = useApp();
  const [showDecrypted, setShowDecrypted] = useState({});

  const toggleDecrypted = (id) => {
    setShowDecrypted(prev => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-200">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-semibold tracking-tight text-neutral-900">
              Privacy, Encryption & Cryptographic Integrity
            </h1>
            <span className="text-[11px] font-mono font-medium px-2 py-0.5 rounded bg-neutral-100 text-neutral-600 border border-neutral-200">
              AES-256-GCM & SHA-256
            </span>
          </div>
        </div>
      </div>

      {/* Cryptographic Controls Banner */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-neutral-200 p-4 rounded-lg space-y-1.5">
          <div className="flex items-center justify-between text-xs text-neutral-500">
            <span>Encryption Standard</span>
            <Lock className="w-4 h-4 text-neutral-600" />
          </div>
          <div className="text-base font-semibold text-neutral-900">AES-256-GCM</div>
          <p className="text-[11px] text-neutral-500 leading-relaxed">
            Authenticated symmetric encryption with unique 96-bit IVs and 128-bit authentication tags.
          </p>
        </div>

        <div className="bg-white border border-neutral-200 p-4 rounded-lg space-y-1.5">
          <div className="flex items-center justify-between text-xs text-neutral-500">
            <span>Integrity Digest</span>
            <FileCheck2 className="w-4 h-4 text-neutral-600" />
          </div>
          <div className="text-base font-semibold text-neutral-900">SHA-256 Digests</div>
          <p className="text-[11px] text-neutral-500 leading-relaxed">
            Deterministic cryptographic hashing to verify records against corruption or unprivileged modification.
          </p>
        </div>

        <div className="bg-white border border-neutral-200 p-4 rounded-lg space-y-1.5">
          <div className="flex items-center justify-between text-xs text-neutral-500">
            <span>Key Management Model</span>
            <Key className="w-4 h-4 text-neutral-600" />
          </div>
          <div className="text-base font-semibold text-neutral-900">Server-Isolated Secrets</div>
          <p className="text-[11px] text-neutral-500 leading-relaxed">
            Keys isolated in protected server environment variables; never exposed to browser bundles.
          </p>
        </div>
      </div>

      {/* Synthetic Records & Interactive Tamper Demo */}
      <div className="bg-white border border-neutral-200 rounded-lg p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-neutral-200">
          <div>
            <h2 className="text-sm font-semibold text-neutral-900 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              Protected Patient Telemetry Records
            </h2>
            <p className="text-xs text-neutral-500 mt-0.5">
              Execute tamper inspection to verify real-time cryptographic digest mismatch detection.
            </p>
          </div>
        </div>

        <div className="space-y-3">
          {integrityRecords.map((rec) => {
            const isTampered = rec.status === 'TAMPERED';
            const decrypted = showDecrypted[rec.recordId];

            return (
              <div
                key={rec.recordId}
                className={`
                  p-4 rounded border transition-swiss
                  ${isTampered
                    ? 'bg-red-50/50 border-red-200'
                    : 'bg-white border-neutral-200'
                  }
                `}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-neutral-100 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-semibold text-neutral-900">{rec.recordId}</span>
                    <span className="text-xs text-neutral-600">• {rec.recordType}</span>
                    <span className="text-[11px] font-mono text-neutral-400">({rec.deviceId})</span>
                  </div>

                  <div className="flex items-center gap-2">
                    {isTampered ? (
                      <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-red-50 text-red-700 border border-red-200 flex items-center gap-1">
                        <ShieldAlert className="w-3 h-3 text-red-600" /> INTEGRITY MISMATCH / TAMPERED
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" /> VERIFIED & INTACT
                      </span>
                    )}

                    {/* Tamper / Re-sync Buttons */}
                    {isTampered ? (
                      <button
                        onClick={() => recomputeAndVerify(rec.recordId)}
                        className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-medium flex items-center gap-1 transition-swiss"
                      >
                        <RefreshCw className="w-3 h-3" /> Re-sync & Verify
                      </button>
                    ) : (
                      <button
                        onClick={() => tamperRecord(rec.recordId)}
                        className="px-2.5 py-1 bg-white hover:bg-red-50 text-red-600 border border-red-200 rounded text-xs font-medium flex items-center gap-1 transition-swiss"
                      >
                        <AlertTriangle className="w-3 h-3" /> Inject Tamper Test
                      </button>
                    )}
                  </div>
                </div>

                {/* Cryptographic Hashes & Ciphertext */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3 text-xs">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-neutral-500">
                      <span>Stored SHA-256 Digest (reference):</span>
                      <span className="text-[10px] font-mono text-neutral-400">Checked: {rec.lastVerified}</span>
                    </div>
                    <div className="p-2 bg-neutral-50 border border-neutral-200 rounded font-mono text-[11px] text-neutral-800 truncate" title={rec.sha256Hash}>
                      {rec.sha256Hash}
                    </div>

                    {rec.computedHash && (
                      <>
                        <div className="flex items-center justify-between text-neutral-500 pt-1">
                          <span>Recomputed Digest:</span>
                          <span className={`text-[10px] font-mono font-semibold ${rec.isMatch ? 'text-emerald-600' : 'text-red-600'}`}>
                            {rec.isMatch ? 'MATCHES STORED DIGEST' : 'MISMATCH — PAYLOAD ALTERED'}
                          </span>
                        </div>
                        <div
                          className={`p-2 rounded font-mono text-[11px] truncate border ${
                            rec.isMatch
                              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                              : 'bg-red-50 border-red-200 text-red-800'
                          }`}
                          title={rec.computedHash}
                        >
                          {rec.computedHash}
                        </div>
                      </>
                    )}
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-neutral-500">
                      <span>AES-256-GCM Ciphertext Hex:</span>
                      <button
                        onClick={() => toggleDecrypted(rec.recordId)}
                        className="text-[11px] text-neutral-700 hover:text-black underline flex items-center gap-1"
                      >
                        {decrypted ? <Unlock className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                        {decrypted ? "Hide Plaintext" : "Decrypt Payload"}
                      </button>
                    </div>
                    <div className="p-2 bg-neutral-50 border border-neutral-200 rounded font-mono text-[11px] text-neutral-600 truncate" title={rec.encryptedDataHex || rec.encryptedPayload}>
                      {rec.encryptedDataHex || rec.encryptedPayload || "Not Encrypted"}
                    </div>
                  </div>
                </div>

                {/* Plaintext view (if toggled) */}
                {decrypted && (
                  <div className="mt-3 p-3 bg-neutral-50 border border-neutral-300 rounded space-y-1">
                    <span className="text-[11px] font-medium text-neutral-800 flex items-center gap-1">
                      <Code2 className="w-3.5 h-3.5 text-neutral-600" /> Authenticated Plaintext Payload:
                    </span>
                    <pre className="font-mono text-xs text-neutral-900 overflow-x-auto whitespace-pre-wrap p-2 bg-white rounded border border-neutral-200">
                      {rec.payloadJson || rec.rawPayload}
                    </pre>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Security Scope & Limitation Notice */}
      <div className="p-4 bg-neutral-50 border border-neutral-200 rounded-lg flex items-start gap-3 text-xs text-neutral-600">
        <Info className="w-4 h-4 text-neutral-500 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <span className="font-semibold text-neutral-900">Prototype Integrity Notice:</span>
          <p className="leading-relaxed">
            Hash digests stored alongside records verify transmission integrity and unprivileged tampering. High-assurance medical architectures mirror digests to write-once-read-many (WORM) audit ledgers to prevent unauthorized root modifications.
          </p>
        </div>
      </div>
    </div>
  );
}
