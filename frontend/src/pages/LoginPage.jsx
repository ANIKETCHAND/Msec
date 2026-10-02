import React, { useState } from 'react';
import { useApp, DEMO_USERS } from '../context/AppContext';
import { api } from '../services/api';
import { ShieldCheck, Lock, Mail, ArrowRight, UserCheck, ShieldAlert, AlertCircle, Info, Loader2 } from 'lucide-react';

export default function LoginPage() {
  const { setCurrentUser, setCurrentPage, logAudit } = useApp();
  const [selectedRole, setSelectedRole] = useState('analyst');
  const [email, setEmail] = useState(DEMO_USERS.analyst.email);
  const [password, setPassword] = useState(DEMO_USERS.analyst.password || 'analystpassword123');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleRoleSelect = (roleKey) => {
    setSelectedRole(roleKey);
    setEmail(DEMO_USERS[roleKey].email);
    setPassword(DEMO_USERS[roleKey].password || 'analystpassword123');
    setError('');
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please provide both email and password.');
      return;
    }
    setError('');
    setSubmitting(true);

    try {
      // 1. Authenticate against FastAPI backend endpoint
      await api.login(email, password);

      // 2. Retrieve authenticated session profile
      const userProfile = await api.getMe();

      const matchedRoleKey = Object.keys(DEMO_USERS).find(k => DEMO_USERS[k].email === email) || selectedRole;
      const meta = DEMO_USERS[matchedRoleKey] || {};

      const activeUser = {
        ...meta,
        id: userProfile.id,
        email: userProfile.email,
        name: userProfile.full_name || meta.name || email,
        role: userProfile.role,
        password: password
      };

      setCurrentUser(activeUser);
      logAudit('USER_LOGIN', 'AuthSession', activeUser.email, `User logged in with role ${activeUser.role}.`);
      setCurrentPage('dashboard');
    } catch (err) {
      console.warn("[Login] Authentication error:", err.message);
      setError(err.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-navy-950 flex flex-col justify-center items-center p-4 selection:bg-mediblue-500 selection:text-white">
      {/* Background radial glow */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-mediblue-600/10 via-transparent to-transparent pointer-events-none" />

      <div className="max-w-md w-full relative z-10 space-y-6">
        {/* Header Branding */}
        <div className="text-center space-y-2">
          <div className="inline-flex p-3 bg-mediblue-500/10 border border-mediblue-500/30 rounded-2xl shadow-inner">
            <ShieldCheck className="w-10 h-10 text-mediblue-400" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">MediShield Portal</h1>
          <p className="text-xs text-slate-400">
            Internet of Medical Things (IoMT) Security & Privacy Platform
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-navy-900 border border-navy-800 rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6">
          <div className="space-y-1">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-300">
              Role-Based Prototype Access
            </h2>
            <p className="text-xs text-slate-400">
              Select an academic demonstration persona to test authorization tiers:
            </p>
          </div>

          {/* Quick Demo Role Cards */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { key: 'admin', label: 'Admin', desc: 'Full System Control' },
              { key: 'analyst', label: 'Analyst', desc: 'Incident Triage & ML' },
              { key: 'doctor', label: 'Doctor', desc: 'Clinical Vitals Only' },
            ].map(r => (
              <button
                key={r.key}
                type="button"
                onClick={() => handleRoleSelect(r.key)}
                className={`
                  p-2.5 rounded-xl border text-center transition flex flex-col items-center justify-center
                  ${selectedRole === r.key
                    ? 'bg-mediblue-500/20 border-mediblue-500 text-white shadow-sm'
                    : 'bg-navy-800/60 border-navy-700/80 text-slate-400 hover:bg-navy-800 hover:text-slate-200'
                  }
                `}
              >
                <span className="text-xs font-bold">{r.label}</span>
                <span className="text-[10px] text-slate-400 mt-0.5 line-clamp-1">{r.desc}</span>
              </button>
            ))}
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3 bg-medidanger-500/10 border border-medidanger-500/30 rounded-xl flex items-center gap-2 text-xs text-medidanger-500">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Credentials Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-300">Demo User Email</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-navy-950 border border-navy-700 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-mediblue-500"
                  required
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-300">Demo Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-navy-950 border border-navy-700 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-mediblue-500"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2.5 px-4 bg-mediblue-600 hover:bg-mediblue-500 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition shadow-lg shadow-mediblue-600/20 disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Verifying Credentials...</span>
                </>
              ) : (
                <>
                  <span>Authenticate Session</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Persona Permissions Preview */}
          <div className="p-3 bg-navy-950/60 rounded-xl border border-navy-800 text-[11px] text-slate-400 space-y-1">
            <div className="flex items-center gap-1.5 text-slate-300 font-semibold">
              <UserCheck className="w-3.5 h-3.5 text-mediblue-400" />
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
        <div className="flex items-start gap-2 p-3 bg-navy-900/50 border border-navy-800/80 rounded-xl text-[11px] text-slate-400">
          <Info className="w-4 h-4 text-mediblue-400 shrink-0 mt-0.5" />
          <p>
            Academic research prototype only. Never connect to real medical equipment or patient records.
          </p>
        </div>
      </div>
    </div>
  );
}
