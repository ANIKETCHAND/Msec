import React, { useState, useEffect } from 'react';
import {
  X,
  User,
  ShieldCheck,
  ChevronRight,
  Plus,
  ArrowLeft,
  CheckCircle2,
  RefreshCw,
  Lock,
  Globe
} from 'lucide-react';

const PRESET_GOOGLE_ACCOUNTS = [
  {
    name: 'Sarah Chen',
    email: 'sarah.chen@hospital-medishield.org',
    role: 'Security Analyst',
    roleDesc: 'SOC Triage & IoMT Telemetry ML Analyst',
    avatarBg: 'bg-emerald-600',
    initials: 'SC',
    photo: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80'
  },
  {
    name: 'Dr. Marcus Vance',
    email: 'marcus.vance@hospital-medishield.org',
    role: 'Administrator',
    roleDesc: 'Chief Medical Information Security Officer',
    avatarBg: 'bg-blue-600',
    initials: 'MV',
    photo: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80'
  },
  {
    name: 'Dr. Elena Rostova',
    email: 'elena.rostova@hospital-medishield.org',
    role: 'Doctor Demo',
    roleDesc: 'Attending ICU Critical Care Physician',
    avatarBg: 'bg-indigo-600',
    initials: 'ER',
    photo: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=80'
  }
];

export default function GoogleSignInModal({
  isOpen = false,
  onClose,
  onSelectAccount,
  loading = false
}) {
  const [customMode, setCustomMode] = useState(false);
  const [customEmail, setCustomEmail] = useState('');
  const [customName, setCustomName] = useState('');
  const [customRole, setCustomRole] = useState('Security Analyst');
  const [validationError, setValidationError] = useState('');

  useEffect(() => {
    if (!isOpen) {
      setCustomMode(false);
      setCustomEmail('');
      setCustomName('');
      setValidationError('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCustomSubmit = (e) => {
    e.preventDefault();
    setValidationError('');

    const emailTrimmed = customEmail.trim();
    if (!emailTrimmed) {
      setValidationError('Please enter a valid Google email address.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailTrimmed)) {
      setValidationError('Invalid email format (e.g. name@gmail.com).');
      return;
    }

    const nameTrimmed = customName.trim() || emailTrimmed.split('@')[0].replace('.', ' ').replace(/\b\w/g, l => l.toUpperCase());

    onSelectAccount({
      email: emailTrimmed,
      name: nameTrimmed,
      role: customRole,
      photo: null
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn select-none">
      <div className="relative w-full max-w-[420px] bg-white rounded-2xl shadow-2xl border border-[#E5E7EB] overflow-hidden">
        {/* Top Google Header */}
        <div className="pt-6 pb-4 px-6 text-center border-b border-[#F3F4F6]">
          <div className="flex items-center justify-between mb-4">
            {customMode ? (
              <button
                type="button"
                onClick={() => setCustomMode(false)}
                className="p-1 rounded-full hover:bg-[#F3F4F6] text-[#6B7280] transition-swiss cursor-pointer"
                title="Back to account list"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            ) : (
              <div className="w-6 h-6" />
            )}

            {/* Official Google G Logo */}
            <div className="flex items-center justify-center">
              <svg className="w-6 h-6" viewBox="0 0 24 24">
                <path
                  fill="#EA4335"
                  d="M12 5c1.6 0 3 .6 4.1 1.6l3.1-3.1C17.3 1.8 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.4 9 5 12 5z"
                />
                <path
                  fill="#4285F4"
                  d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.8z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.3 0-.8.1-1.6.4-2.3L1.9 7.3C.7 9.7 0 12.3 0 15.2c0 2.9.7 5.5 1.9 7.9l3.7-2.9z"
                />
                <path
                  fill="#34A853"
                  d="M12 23.5c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.4-6.4-5.6L1.9 16.1C3.7 19.8 7.5 22.5 12 22.5z"
                />
              </svg>
            </div>

            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="p-1 rounded-full hover:bg-[#F3F4F6] text-[#6B7280] transition-swiss cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <h3 className="text-base font-semibold text-[#1F2937]">
            {customMode ? 'Sign in with your Google Account' : 'Sign in with Google'}
          </h3>
          <p className="text-xs text-[#6B7280] mt-1">
            to continue to <strong className="text-[#111827] font-semibold">MediShield IoMT</strong>
          </p>
        </div>

        {/* Content Body */}
        <div className="p-5 max-h-[460px] overflow-y-auto">
          {!customMode ? (
            <div className="space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[#9CA3AF] mb-2 px-1">
                Choose an authorized clinical account
              </p>

              {/* Pre-configured Hospital Google Accounts */}
              {PRESET_GOOGLE_ACCOUNTS.map((acc) => (
                <button
                  key={acc.email}
                  type="button"
                  disabled={loading}
                  onClick={() => onSelectAccount(acc)}
                  className="w-full text-left p-3 rounded-xl border border-[#E5E7EB] hover:border-[#1677FF] hover:bg-[#F8FAFC] transition-swiss flex items-center justify-between group cursor-pointer"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {acc.photo ? (
                      <img
                        src={acc.photo}
                        alt=""
                        className="w-10 h-10 rounded-full object-cover shrink-0 border border-neutral-200"
                      />
                    ) : (
                      <div className={`w-10 h-10 rounded-full ${acc.avatarBg} text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs`}>
                        {acc.initials}
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-semibold text-[#1F2937] truncate group-hover:text-[#1677FF] transition-colors">
                          {acc.name}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-neutral-100 text-[#4B5563] font-medium font-mono shrink-0">
                          {acc.role.split(' ')[0]}
                        </span>
                      </div>
                      <p className="text-[11px] text-[#6B7280] truncate font-mono mt-0.5">
                        {acc.email}
                      </p>
                      <p className="text-[10px] text-[#9CA3AF] truncate mt-0.5">
                        {acc.roleDesc}
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-[#9CA3AF] group-hover:text-[#1677FF] shrink-0 transition-transform group-hover:translate-x-0.5" />
                </button>
              ))}

              {/* Add / Use another account */}
              <div className="pt-2">
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => setCustomMode(true)}
                  className="w-full text-left p-3 rounded-xl border border-dashed border-[#D1D5DB] hover:border-[#1677FF] hover:bg-[#F8FAFC] transition-swiss flex items-center gap-3 text-xs text-[#374151] hover:text-[#1677FF] font-medium cursor-pointer"
                >
                  <div className="w-10 h-10 rounded-full bg-[#F3F4F6] text-[#6B7280] flex items-center justify-center shrink-0">
                    <Plus className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-semibold block">Use another Google account</span>
                    <span className="text-[11px] text-[#6B7280] font-normal">
                      Sign in with personal or institution Google email
                    </span>
                  </div>
                </button>
              </div>
            </div>
          ) : (
            /* Custom Google Email Form */
            <form onSubmit={handleCustomSubmit} className="space-y-4">
              {validationError && (
                <div className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs">
                  {validationError}
                </div>
              )}

              <div className="space-y-1">
                <label className="text-xs font-medium text-[#374151] block">
                  Google Email Address <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={customEmail}
                  onChange={(e) => setCustomEmail(e.target.value)}
                  placeholder="e.g. physician@gmail.com"
                  className="w-full px-3 py-2 text-xs border border-[#D1D5DB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1677FF] focus:border-transparent font-mono"
                  required
                  autoFocus
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-[#374151] block">
                  Full Name (Optional)
                </label>
                <input
                  type="text"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  placeholder="e.g. Dr. Alex Kumar"
                  className="w-full px-3 py-2 text-xs border border-[#D1D5DB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1677FF] focus:border-transparent"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-[#374151] block">
                  Assign Healthcare Role
                </label>
                <select
                  value={customRole}
                  onChange={(e) => setCustomRole(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-[#D1D5DB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1677FF] bg-white cursor-pointer"
                >
                  <option value="Security Analyst">Security Analyst (Triage & Threat Detection)</option>
                  <option value="Administrator">Administrator (Full Hospital System Control)</option>
                  <option value="Doctor Demo">Doctor / Physician (Clinical Read-Only)</option>
                </select>
              </div>

              <div className="pt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCustomMode(false)}
                  className="w-1/3 py-2 rounded-lg border border-[#D1D5DB] text-xs font-medium text-[#374151] hover:bg-[#F3F4F6] transition-swiss cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-2/3 py-2 rounded-lg bg-[#1677FF] hover:bg-[#0958D9] text-white text-xs font-semibold shadow-xs flex items-center justify-center gap-2 transition-swiss cursor-pointer disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Authenticating...</span>
                    </>
                  ) : (
                    <span>Continue with Google &rarr;</span>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Google Terms & Privacy Footer */}
        <div className="p-4 bg-[#F9FAFB] border-t border-[#E5E7EB] text-[11px] text-[#6B7280] leading-relaxed">
          <p className="flex items-center gap-1 font-medium text-[#4B5563] mb-1">
            <Lock className="w-3 h-3 text-[#1677FF]" />
            <span>Secure OAuth 2.0 Single Sign-On</span>
          </p>
          <p>
            To continue, Google will share your verified name, email address, and profile credentials with MediShield IoMT Security.
          </p>
        </div>
      </div>
    </div>
  );
}
