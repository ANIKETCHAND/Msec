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

export default function PrivacyIntegrityPage() {
  const { integrityRecords, tamperRecord, recomputeAndVerify, currentUser } = useApp();
  const [showDecrypted, setShowDecrypted] = useState({});

  const toggleDecrypted = (id) => {
    setShowDecrypted(prev => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div>
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          <Lock className="w-5 h-5 text-mediblue-400" />
          Privacy, Authenticated Encryption & Data Integrity
        </h1>
        <p className="text-xs text-slate-400">
          Demonstration of AES-256-GCM authenticated encryption and SHA-256 cryptographic digest tamper detection.
        </p>
      </div>

      {/* Cryptographic Controls Banner */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-navy-900 border border-navy-800 p-5 rounded-2xl space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Encryption Standard</span>
            <Lock className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-lg font-bold text-white">AES-256-GCM</div>
          <p className="text-[11px] text-slate-400">
            Authenticated symmetric encryption with unique 96-bit IVs/nonces and 128-bit authentication tags.
          </p>
        </div>

        <div className="bg-navy-900 border border-navy-800 p-5 rounded-2xl space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Integrity Digest</span>
            <FileCheck2 className="w-4 h-4 text-mediblue-400" />
          </div>
          <div className="text-lg font-bold text-white">SHA-256 Digests</div>
          <p className="text-[11px] text-slate-400">
            Deterministic cryptographic hashing to verify records against bit-level corruption or unauthorized modification.
          </p>
        </div>

        <div className="bg-navy-900 border border-navy-800 p-5 rounded-2xl space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Key Management Model</span>
            <Key className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-lg font-bold text-white">Server-Isolated Keys</div>
          <p className="text-[11px] text-slate-400">
            Environment secrets strictly isolated from client web bundles. Never hardcoded or transmitted.
          </p>
        </div>
      </div>

      {/* Synthetic Records & Interactive Tamper Demo */}
      <div className="bg-navy-900 border border-navy-800 rounded-2xl p-6 space-y-5 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-navy-800 pb-4">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              Protected Synthetic Patient Telemetry Records
            </h2>
            <p className="text-xs text-slate-400">
              Interactive testbed: Simulate memory modification to verify that SHA-256 digests instantly catch tampering.
            </p>
          </div>
        </div>

        <div className="space-y-4">
          {integrityRecords.map((rec) => {
            const isTampered = rec.status === 'TAMPERED';
            const decrypted = showDecrypted[rec.recordId];

            return (
              <div
                key={rec.recordId}
                className={`
                  p-4 rounded-xl border transition
                  ${isTampered
                    ? 'bg-medidanger-950/30 border-medidanger-500/50'
                    : 'bg-navy-950/70 border-navy-800'
                  }
                `}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-navy-800/80 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-mediblue-400">{rec.recordId}</span>
                    <span className="text-xs text-slate-300 font-semibold">• {rec.recordType}</span>
                    <span className="text-[11px] text-slate-400">({rec.deviceId})</span>
                  </div>

                  <div className="flex items-center gap-2">
                    {isTampered ? (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-red-500/20 text-red-400 border border-red-500/30 flex items-center gap-1">
                        <ShieldAlert className="w-3 h-3" /> INTEGRITY MISMATCH / TAMPERED
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> VERIFIED & INTACT
                      </span>
                    )}

                    {/* Tamper / Re-sync Buttons */}
                    {isTampered ? (
                      <button
                        onClick={() => recomputeAndVerify(rec.recordId)}
                        className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1 transition"
                      >
                        <RefreshCw className="w-3 h-3" /> Re-sync & Verify
                      </button>
                    ) : (
                      <button
                        onClick={() => tamperRecord(rec.recordId)}
                        className="px-2.5 py-1 bg-red-600/30 hover:bg-red-600 text-red-300 hover:text-white border border-red-500/40 rounded-lg text-xs font-semibold flex items-center gap-1 transition"
                      >
                        <AlertTriangle className="w-3 h-3" /> Simulate Tampering
                      </button>
                    )}
                  </div>
                </div>

                {/* Cryptographic Hashes & Ciphertext */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3 text-xs">
                  <div className="space-y-1">
                    <span className="text-slate-400 flex items-center justify-between">
                      <span>SHA-256 Digest (Digest Algorithm):</span>
                      <span className="text-[10px] font-mono text-slate-400">Last check: {rec.lastVerified}</span>
                    </span>
                    <div className="p-2 bg-navy-900 border border-navy-800 rounded-lg font-mono text-[11px] text-slate-300 truncate">
                      {rec.sha256Hash}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <span className="text-slate-400 flex items-center justify-between">
                      <span>AES-256-GCM Ciphertext Hex:</span>
                      <button
                        onClick={() => toggleDecrypted(rec.recordId)}
                        className="text-[10px] text-mediblue-400 hover:underline flex items-center gap-1"
                      >
                        {decrypted ? <Unlock className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                        {decrypted ? "Hide Plaintext" : "Decrypt Payload"}
                      </button>
                    </span>
                    <div className="p-2 bg-navy-900 border border-navy-800 rounded-lg font-mono text-[11px] text-slate-400 truncate">
                      {rec.encryptedDataHex}
                    </div>
                  </div>
                </div>

                {/* Plaintext view (if toggled) */}
                {decrypted && (
                  <div className="mt-3 p-3 bg-navy-900 border border-mediblue-500/30 rounded-xl space-y-1 animate-in fade-in">
                    <span className="text-[11px] text-mediblue-400 font-semibold flex items-center gap-1">
                      <Code2 className="w-3.5 h-3.5" /> Authenticated Plaintext Payload:
                    </span>
                    <pre className="font-mono text-xs text-emerald-400 overflow-x-auto">
                      {rec.payloadJson}
                    </pre>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Security Scope & Limitation Notice */}
      <div className="p-4 bg-navy-900 border border-navy-800 rounded-2xl flex items-start gap-3 text-xs text-slate-400">
        <Info className="w-5 h-5 text-mediblue-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <span className="font-semibold text-slate-200">Prototype Integrity Limitation Notice:</span>
          <p className="leading-relaxed">
            A hash digest stored alongside a record in the same database verifies data integrity during transmission
            or unprivileged modification. However, it does not guarantee protection against an attacker with full root access
            to the underlying database who could recalculate both values. In high-assurance hospital architectures,
            digests should be mirrored to immutable, write-once-read-many (WORM) audit ledgers.
          </p>
        </div>
      </div>
    </div>
  );
}
