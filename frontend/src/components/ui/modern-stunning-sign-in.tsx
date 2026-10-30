"use client";

import * as React from "react";
import { ShieldCheck, Loader2 } from "lucide-react";

export interface SignIn1Props {
  onSignIn?: (credentials: { email: string; password: string }) => void | Promise<void>;
  onGoogleSignIn?: () => void;
  title?: string;
  subtitle?: string;
  communityText?: string;
  defaultEmail?: string;
  defaultPassword?: string;
  loading?: boolean;
  externalError?: string;
  rolePresets?: Array<{
    key: string;
    label: string;
    email: string;
    password?: string;
    desc?: string;
  }>;
  onRoleSelect?: (roleKey: string) => void;
  selectedRole?: string;
}

const STOCK_AVATARS = [
  "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&auto=format&fit=crop&q=80",
];

const SignIn1: React.FC<SignIn1Props> = ({
  onSignIn,
  title = "MediShield",
  subtitle = "IoMT Security & Continuous Monitoring Platform",
  communityText = "thousands of clinical engineers and cybersecurity analysts",
  defaultEmail = "",
  defaultPassword = "",
  loading = false,
  externalError = "",
  rolePresets,
  onRoleSelect,
  selectedRole,
  onGoogleSignIn,
}) => {
  const [email, setEmail] = React.useState(defaultEmail);
  const [password, setPassword] = React.useState(defaultPassword);
  const [error, setError] = React.useState("");

  React.useEffect(() => {
    if (defaultEmail) setEmail(defaultEmail);
  }, [defaultEmail]);

  React.useEffect(() => {
    if (defaultPassword) setPassword(defaultPassword);
  }, [defaultPassword]);

  React.useEffect(() => {
    if (externalError) setError(externalError);
  }, [externalError]);

  const validateEmail = (val: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
  };

  const handleSignIn = async () => {
    if (!email || !password) {
      setError("Please enter both email and password.");
      return;
    }
    if (!validateEmail(email)) {
      setError("Please enter a valid email address.");
      return;
    }
    setError("");

    if (onSignIn) {
      try {
        await onSignIn({ email, password });
      } catch (err: any) {
        setError(err.message || "Sign in failed.");
      }
    } else {
      alert("Sign in successful! (Demo)");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSignIn();
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#121212] relative overflow-hidden w-full p-4 selection:bg-[#1677FF] selection:text-white">
      {/* Background radial glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-tr from-[#1677FF]/10 via-[#000000]/0 to-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Centered glass card */}
      <div className="relative z-10 w-full max-w-sm rounded-3xl bg-gradient-to-r from-[#ffffff10] to-[#121212] backdrop-blur-md border border-white/10 shadow-2xl p-8 flex flex-col items-center">
        {/* Logo */}
        <div className="flex items-center justify-center w-12 h-12 rounded-full bg-white/20 mb-4 shadow-lg border border-white/20">
          <ShieldCheck className="w-6 h-6 text-[#1677FF]" />
        </div>

        {/* Title & Subtitle */}
        <h2 className="text-2xl font-semibold text-white mb-1 text-center tracking-tight">
          {title}
        </h2>
        {subtitle && (
          <p className="text-xs text-gray-400 mb-6 text-center leading-relaxed">
            {subtitle}
          </p>
        )}

        {/* Role Presets (if provided for rapid persona switching) */}
        {rolePresets && rolePresets.length > 0 && (
          <div className="w-full mb-4">
            <p className="text-[10px] uppercase font-semibold tracking-wider text-gray-400 mb-1.5 text-center">
              Demonstration Personas
            </p>
            <div className="grid grid-cols-3 gap-1.5">
              {rolePresets.map((r) => (
                <button
                  key={r.key}
                  type="button"
                  onClick={() => {
                    if (onRoleSelect) onRoleSelect(r.key);
                    setEmail(r.email);
                    if (r.password) setPassword(r.password);
                    setError("");
                  }}
                  className={`px-2 py-1.5 rounded-lg text-center transition text-xs border ${
                    selectedRole === r.key
                      ? "bg-[#1677FF] text-white border-[#1677FF] font-medium shadow-sm"
                      : "bg-white/5 text-gray-300 border-white/10 hover:bg-white/10"
                  }`}
                >
                  <div className="font-semibold">{r.label}</div>
                  {r.desc && (
                    <div className="text-[9px] opacity-75 truncate">{r.desc}</div>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Form */}
        <div className="flex flex-col w-full gap-4">
          <div className="w-full flex flex-col gap-3">
            <input
              placeholder="Email"
              type="email"
              value={email}
              autoComplete="email"
              className="w-full px-5 py-3 rounded-xl bg-white/10 text-white placeholder-gray-400 text-sm border border-white/10 focus:outline-none focus:ring-2 focus:ring-[#1677FF] focus:border-transparent transition"
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={handleKeyDown}
            />
            <input
              placeholder="Password"
              type="password"
              value={password}
              autoComplete="current-password"
              className="w-full px-5 py-3 rounded-xl bg-white/10 text-white placeholder-gray-400 text-sm border border-white/10 focus:outline-none focus:ring-2 focus:ring-[#1677FF] focus:border-transparent transition"
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={handleKeyDown}
            />
            {error && (
              <div className="text-xs text-rose-400 text-left bg-rose-950/40 border border-rose-800/50 p-2.5 rounded-lg">
                {error}
              </div>
            )}
          </div>

          <hr className="opacity-10 border-white" />

          <div>
            <button
              type="button"
              onClick={handleSignIn}
              disabled={loading}
              className="w-full bg-[#1677FF] hover:bg-[#0958D9] text-white font-medium px-5 py-3 rounded-full shadow hover:brightness-110 transition mb-3 text-sm flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Authenticating...</span>
                </>
              ) : (
                <span>Sign in</span>
              )}
            </button>

            {/* Google Sign In */}
            <button
              type="button"
              onClick={onGoogleSignIn || (() => alert("SSO integration available via hospital SAML / OAuth"))}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-b from-[#232526] to-[#2d2e30] border border-white/10 rounded-full px-5 py-3 font-medium text-white shadow hover:brightness-110 transition mb-2 text-sm cursor-pointer"
            >
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
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
              <span>Continue with Google</span>
            </button>

            <div className="w-full text-center mt-3">
              <span className="text-xs text-gray-400">
                Hospital staff?{" "}
                <a
                  href="#contact-admin"
                  onClick={(e) => {
                    e.preventDefault();
                    alert("Contact your Biomedical Clinical Engineering administrator for credentials.");
                  }}
                  className="underline text-white/80 hover:text-white"
                >
                  Contact Clinical Admin
                </a>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* User count and avatars */}
      <div className="relative z-10 mt-8 flex flex-col items-center text-center">
        <p className="text-gray-400 text-xs mb-2">
          Trusted by <span className="font-medium text-white">{communityText}</span>.
        </p>
        <div className="flex -space-x-2">
          {STOCK_AVATARS.map((src, i) => (
            <img
              key={i}
              src={src}
              alt={`Clinical Security Analyst ${i + 1}`}
              className="w-8 h-8 rounded-full border-2 border-[#181824] object-cover"
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export { SignIn1 };

export default SignIn1;
