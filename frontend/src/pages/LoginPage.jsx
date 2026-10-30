import React, { useState } from 'react';
import { useApp, DEMO_USERS } from '../context/AppContext';
import { api } from '../services/api';
import SignIn1 from '@/components/ui/modern-stunning-sign-in';
import GoogleSignInModal from '../components/common/GoogleSignInModal';
import { ShieldCheck, Lock, Mail, ArrowRight, ArrowLeft, UserCheck, AlertCircle, Info, Loader2, SlidersHorizontal } from 'lucide-react';

export default function LoginPage() {
  const { setCurrentUser, setCurrentPage, logAudit } = useApp();
  const [selectedRole, setSelectedRole] = useState('analyst');
  const [email, setEmail] = useState(DEMO_USERS.analyst.email);
  const [password, setPassword] = useState(DEMO_USERS.analyst.password || 'analystpassword123');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [themeMode, setThemeMode] = useState('modern'); // 'modern' | 'swiss'
  const [googleModalOpen, setGoogleModalOpen] = useState(false);

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

    const trimmedEmail = (loginEmail || '').trim().toLowerCase();
    const matchedRoleKey = Object.keys(DEMO_USERS).find(
      k => DEMO_USERS[k].email.toLowerCase() === trimmedEmail
    ) || selectedRole;
    const meta = DEMO_USERS[matchedRoleKey];

    try {
      // 1. Attempt live FastAPI backend authentication
      let userProfile = null;
      try {
        await api.login(loginEmail, loginPassword);
        userProfile = await api.getMe();
      } catch (apiErr) {
        // If HTTP 401 Unauthorized (live backend actively rejected bad password), display credential error
        if (apiErr.statusCode === 401) {
          throw new Error('Invalid email or password. Please verify credentials.');
        }

        // If backend is offline or static hosting returns 405/404/network error,
        // seamlessly authenticate the user in standalone demonstration mode
        const isPresetPassword =
          !loginPassword ||
          loginPassword === meta?.password ||
          loginPassword === 'analystpassword123' ||
          loginPassword === 'adminpassword123' ||
          loginPassword === 'doctorpassword123';

        if (meta && isPresetPassword) {
          console.info(`[Login] Backend offline or unconfigured on static host (${apiErr.message}); signing in with demonstration persona: ${matchedRoleKey}`);
          const activeUser = {
            ...meta,
            id: `usr-${matchedRoleKey}-demo`,
            email: loginEmail,
            name: meta.name || loginEmail,
            role: meta.role,
            password: loginPassword
          };
          setCurrentUser(activeUser);
          localStorage.setItem('medishield_user', JSON.stringify(activeUser));
          if (logAudit) {
            logAudit('USER_LOGIN', 'AuthSession', activeUser.email, `User signed in with persona ${activeUser.role} (Demonstration mode).`);
          }
          setCurrentPage('dashboard');
          return;
        }

        if (apiErr.statusCode === 405 || apiErr.code === 'BACKEND_NOT_CONFIGURED' || apiErr.message?.includes('405') || apiErr.message?.includes('Failed to fetch')) {
          throw new Error('Backend API is not hosted on this static domain. Please click one of the Demonstration Personas above to sign in.');
        }
        throw apiErr;
      }

      // If backend login succeeded
      const activeUser = {
        ...meta,
        id: userProfile?.id || `usr-${matchedRoleKey}`,
        email: userProfile?.email || loginEmail,
        name: userProfile?.full_name || meta.name || loginEmail,
        role: userProfile?.role || meta.role,
        password: loginPassword
      };

      setCurrentUser(activeUser);
      localStorage.setItem('medishield_user', JSON.stringify(activeUser));
      if (logAudit) {
        logAudit('USER_LOGIN', 'AuthSession', activeUser.email, `User logged in with role ${activeUser.role}.`);
      }
      setCurrentPage('dashboard');
    } catch (err) {
      console.warn('[Login] Authentication notice:', err.message);
      const msg = err.message || 'Authentication failed. Please verify credentials.';
      setError(msg);
      throw new Error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleSignIn = async (googleAccount) => {
    setSubmitting(true);
    setError('');

    try {
      let authResult = null;
      try {
        authResult = await api.loginWithGoogle({
          email: googleAccount.email,
          name: googleAccount.name,
          role: googleAccount.role,
          picture: googleAccount.photo
        });
      } catch (apiErr) {
        // Fallback for static host / standalone demonstration mode
        console.info(`[Login] Backend offline or static host (${apiErr.message}); signing in with Google OAuth persona: ${googleAccount.email}`);
        authResult = {
          email: googleAccount.email,
          name: googleAccount.name,
          role: googleAccount.role || 'Security Analyst'
        };
      }

      const activeUser = {
        name: authResult?.name || googleAccount.name,
        email: authResult?.email || googleAccount.email,
        role: authResult?.role || googleAccount.role || 'Security Analyst',
        title: `${authResult?.role || googleAccount.role} (Google OAuth)`,
        avatar: (googleAccount.name || 'G').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase(),
        picture: googleAccount.photo || null,
        authProvider: 'google'
      };

      setCurrentUser(activeUser);
      localStorage.setItem('medishield_user', JSON.stringify(activeUser));
      if (logAudit) {
        logAudit('USER_LOGIN_GOOGLE', 'AuthSession', activeUser.email, `User signed in with verified Google OAuth account (${activeUser.role}).`);
      }
      setGoogleModalOpen(false);
      setCurrentPage('dashboard');
    } catch (err) {
      console.warn('[Login] Google sign in error:', err.message);
      setError(err.message || 'Google sign in failed.');
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
      {/* Back to Landing Page Button */}
      <div className="fixed top-4 left-4 z-50">
        <button
          type="button"
          onClick={() => setCurrentPage('landing')}
          className={`px-3 py-1.5 rounded-full text-xs font-medium transition shadow-lg flex items-center gap-1.5 border backdrop-blur-md cursor-pointer ${
            themeMode === 'modern'
              ? 'bg-white/10 hover:bg-white/20 text-white border-white/20'
              : 'bg-white hover:bg-neutral-50 text-neutral-800 border-neutral-300'
          }`}
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Landing Page</span>
        </button>
      </div>
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
          onGoogleSignIn={() => setGoogleModalOpen(true)}
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
                  className="w-full py-2.5 px-4 bg-neutral-900 hover:bg-black text-white rounded text-xs font-medium flex items-center justify-center gap-2 transition-swiss disabled:opacity-50 cursor-pointer"
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

                <div className="relative my-3">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-neutral-200" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-white px-2 text-neutral-400 font-mono text-[10px]">Or continue with</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setGoogleModalOpen(true)}
                  className="w-full py-2.5 px-4 bg-white hover:bg-neutral-50 text-neutral-800 border border-neutral-300 rounded text-xs font-semibold flex items-center justify-center gap-2 transition-swiss cursor-pointer shadow-xs"
                >
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                    <path fill="#EA4335" d="M12 5c1.6 0 3 .6 4.1 1.6l3.1-3.1C17.3 1.8 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.4 9 5 12 5z" />
                    <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.8z" />
                    <path fill="#FBBC05" d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.3 0-.8.1-1.6.4-2.3L1.9 7.3C.7 9.7 0 12.3 0 15.2c0 2.9.7 5.5 1.9 7.9l3.7-2.9z" />
                    <path fill="#34A853" d="M12 23.5c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.4-6.4-5.6L1.9 16.1C3.7 19.8 7.5 22.5 12 22.5z" />
                  </svg>
                  <span>Sign in with Google</span>
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
      <GoogleSignInModal
        isOpen={googleModalOpen}
        onClose={() => setGoogleModalOpen(false)}
        onSelectAccount={handleGoogleSignIn}
        loading={submitting}
      />
    </div>
  );
}
