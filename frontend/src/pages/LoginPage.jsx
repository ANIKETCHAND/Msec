import React, { useState } from 'react';
import { useApp, DEMO_USERS } from '../context/AppContext';
import { api } from '../services/api';
import SignIn1 from '@/components/ui/modern-stunning-sign-in';
import { ShieldCheck, Lock, Mail, ArrowRight, UserCheck, AlertCircle, Info, Loader2, SlidersHorizontal } from 'lucide-react';

export default function LoginPage() {
  const { setCurrentUser, setCurrentPage, logAudit } = useApp();
  const [selectedRole, setSelectedRole] = useState('analyst');
  const [email, setEmail] = useState(DEMO_USERS.analyst.email);
  const [password, setPassword] = useState(DEMO_USERS.analyst.password || 'analystpassword123');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [themeMode, setThemeMode] = useState('modern'); // 'modern' | 'swiss'

  const rolePresets = [
    { key: 'analyst', label: 'Analyst', email: DEMO_USERS.analyst.email, password: DEMO_USERS.analyst.password || 'analystpassword123', desc: 'Triage & ML' },
    { key: 'admin', label: 'Admin', email: DEMO_USERS.admin.email, password: DEMO_USERS.admin.password || 'adminpassword123', desc: 'Full Control' },
    { key: 'doctor', label: 'Doctor', email: DEMO_USERS.doctor.email, password: DEMO_USERS.doctor.password || 'doctorpassword123', desc: 'Clinical Vitals' },
  ];

  const handleRoleSelect = (roleKey) => {
    setSelectedRole(roleKey);
    setEmail(DEMO_USERS[roleKey].email);
    setPassword(DEMO_USERS[roleKey].password || 'analystpassword123');
    setError('');
  };

  const handleSignIn = async ({ email: loginEmail, password: loginPassword }) => {
    setSubmitting(true);
    setError('');

    try {
      // 1. Authenticate against FastAPI backend endpoint
      await api.login(loginEmail, loginPassword);

      // 2. Retrieve authenticated session profile
      const userProfile = await api.getMe();

      const matchedRoleKey = Object.keys(DEMO_USERS).find(k => DEMO_USERS[k].email === loginEmail) || selectedRole;
      const meta = DEMO_USERS[matchedRoleKey] || {};

      const activeUser = {
        ...meta,
        id: userProfile.id,
        email: userProfile.email,
        name: userProfile.full_name || meta.name || loginEmail,
        role: userProfile.role,
        password: loginPassword
      };

      setCurrentUser(activeUser);
      logAudit('USER_LOGIN', 'AuthSession', activeUser.email, `User logged in with role ${activeUser.role}.`);
      setCurrentPage('assessment-center');
    } catch (err) {
      console.warn('[Login] Authentication error:', err.message);
      const msg = err.message || 'Authentication failed. Please verify credentials.';
      setError(msg);
      throw new Error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSwissSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please provide both email and password.');
      return;
    }
    await handleSignIn({ email, password }).catch(() => {});
  };

  return (
    <div className="relative min-h-screen">
      {/* View Switcher Toggle */}
      <div className="fixed top-4 right-4 z-50">
        <button
          type="button"
          onClick={() => setThemeMode(prev => (prev === 'modern' ? 'swiss' : 'modern'))}
          className={`px-3 py-1.5 rounded-full text-xs font-medium transition shadow-lg flex items-center gap-1.5 border backdrop-blur-md ${
            themeMode === 'modern'
              ? 'bg-white/10 hover:bg-white/20 text-white border-white/20'
              : 'bg-white hover:bg-neutral-50 text-neutral-800 border-neutral-300'
          }`}
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
          <span>Theme: {themeMode === 'modern' ? 'Modern Dark' : 'Swiss Minimal'}</span>
        </button>
      </div>

      {themeMode === 'modern' ? (
        <SignIn1
          title="MediShield"
          subtitle="IoMT Security & Continuous Monitoring Platform"
          communityText="thousands of biomedical engineers & security analysts"
          defaultEmail={email}
          defaultPassword={password}
          rolePresets={rolePresets}
          selectedRole={selectedRole}
          onRoleSelect={handleRoleSelect}
          onSignIn={handleSignIn}
          loading={submitting}
          externalError={error}
        />
      ) : (
        <div className="min-h-screen bg-[#F5F6F8] flex flex-col justify-center items-center p-4">
          <div className="max-w-md w-full space-y-6">
            {/* Header Branding */}
            <div className="text-center space-y-2">
              <div className="inline-flex p-2.5 bg-white border border-neutral-200 rounded-lg shadow-sm">
                <ShieldCheck className="w-8 h-8 text-[#1677FF]" />
              </div>
              <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">MediShield</h1>
              <p className="text-xs text-neutral-500">
                IoMT Security &amp; Continuous Monitoring Platform
              </p>
            </div>

            {/* Login Card */}
            <div className="bg-white border border-neutral-200 rounded-lg p-6 sm:p-8 shadow-sm space-y-6">
              <div className="space-y-1">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
                  Role-Based Authentication
                </h2>
                <p className="text-xs text-neutral-600">
                  Select an authorized demonstration persona to test authorization tiers:
                </p>
              </div>

              {/* Quick Demo Role Cards */}
              <div className="grid grid-cols-3 gap-2">
                {rolePresets.map(r => (
                  <button
                    key={r.key}
                    type="button"
                    onClick={() => handleRoleSelect(r.key)}
                    className={`
                      p-2.5 rounded border text-center transition-swiss flex flex-col items-center justify-center
                      ${selectedRole === r.key
                        ? 'bg-blue-50/60 border-[#1677FF] text-[#1677FF] font-medium'
                        : 'bg-white border-neutral-200 text-neutral-600 hover:bg-neutral-50'
                      }
                    `}
                  >
                    <span className="text-xs font-semibold">{r.label}</span>
                    <span className="text-[10px] text-neutral-400 mt-0.5 line-clamp-1">{r.desc}</span>
                  </button>
                ))}
              </div>

              {/* Error Message */}
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded text-xs text-red-800 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Credentials Form */}
              <form onSubmit={handleSwissSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-neutral-700">Account Email</label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-neutral-400 absolute left-3 top-2.5" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-white border border-neutral-300 rounded pl-9 pr-3 py-2 text-xs text-neutral-900 focus:outline-none focus:border-neutral-500"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-neutral-700">Password</label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-neutral-400 absolute left-3 top-2.5" />
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-white border border-neutral-300 rounded pl-9 pr-3 py-2 text-xs text-neutral-900 focus:outline-none focus:border-neutral-500"
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-2.5 px-4 bg-neutral-900 hover:bg-black text-white rounded text-xs font-medium flex items-center justify-center gap-2 transition-swiss disabled:opacity-50"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Verifying Credentials...</span>
                    </>
                  ) : (
                    <>
                      <span>Authenticate Session</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </form>

              {/* Persona Permissions Preview */}
              <div className="p-3 bg-neutral-50 rounded border border-neutral-200 text-[11px] text-neutral-600 space-y-1">
                <div className="flex items-center gap-1.5 text-neutral-800 font-semibold">
                  <UserCheck className="w-3.5 h-3.5 text-neutral-600" />
                  Role Permissions: {DEMO_USERS[selectedRole].role}
                </div>
                {selectedRole === 'admin' && (
                  <p>• Full administrative authority: device registration, policy edits, audit trails, and encryption configuration.</p>
                )}
                {selectedRole === 'analyst' && (
                  <p>• Security operations: event triage, ML model evaluation, incident assignment, and security report export.</p>
                )}
                {selectedRole === 'doctor' && (
                  <p>• Clinical read-only: view permitted synthetic patient telemetry; restricted from security policies and audit trails.</p>
                )}
              </div>
            </div>

            {/* Academic Prototype Notice */}
            <div className="flex items-start gap-2.5 p-3 bg-neutral-100/70 border border-neutral-200 rounded text-[11px] text-neutral-600">
              <Info className="w-4 h-4 text-neutral-500 shrink-0 mt-0.5" />
              <p>
                Academic research prototype only. Never connect to real medical equipment or unconsented patient records.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
