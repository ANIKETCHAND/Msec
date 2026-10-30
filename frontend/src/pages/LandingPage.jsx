import React, { useState } from 'react';
import { useApp, DEMO_USERS } from '../context/AppContext';
import { api } from '../services/api';
import {
  Shield,
  ShieldCheck,
  Lock,
  ArrowRight,
  ExternalLink,
  Sparkles,
  UserCheck
} from 'lucide-react';

export default function LandingPage() {
  const { setCurrentUser, setCurrentPage, logAudit, devices, mlModel } = useApp();
  const [loggingInRole, setLoggingInRole] = useState(null);

  const handleQuickLogin = async (roleKey) => {
    setLoggingInRole(roleKey);
    const demo = DEMO_USERS[roleKey];
    try {
      await api.login(demo.email, demo.password || 'analystpassword123');
      const profile = await api.getMe().catch(() => null);
      const activeUser = {
        ...demo,
        id: profile?.id || `usr-${roleKey}`,
        email: profile?.email || demo.email,
        name: profile?.full_name || demo.name,
        role: profile?.role || demo.role
      };
      setCurrentUser(activeUser);
      logAudit('USER_LOGIN', 'AuthSession', activeUser.email, `User quick-logged in as ${activeUser.role} from Landing Page.`);
      setCurrentPage('dashboard');
    } catch (err) {
      console.warn('[LandingPage] Quick login fallback:', err.message);
      setCurrentUser(demo);
      setCurrentPage('dashboard');
    } finally {
      setLoggingInRole(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F6F8] text-[#171717] font-sans flex flex-col selection:bg-[#1677FF] selection:text-white">
      {/* 1. TOP NAVIGATION BAR */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-[#E5E7EB] transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Logo & Identity */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#1677FF] text-white flex items-center justify-center font-bold text-sm shadow-xs">
              <Shield className="w-5 h-5 stroke-[2.25]" />
            </div>
            <div>
              <div className="flex items-baseline gap-2">
                <span className="font-bold text-base tracking-tight text-[#171717]">MediShield</span>
                <span className="text-[11px] font-mono font-medium text-[#1677FF] bg-[#E6F4FF] px-1.5 py-0.2 rounded">v2.0</span>
              </div>
              <p className="text-[10px] text-[#6B7280] font-mono leading-none hidden sm:block">IoMT Security &amp; Privacy Platform</p>
            </div>
          </div>

          {/* Right Action: Log In Button */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => handleQuickLogin('analyst')}
              disabled={loggingInRole !== null}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E5E7EB] hover:bg-[#F9FAFB] text-xs font-medium text-[#171717] transition-swiss cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#F59E0B]" />
              <span>{loggingInRole === 'analyst' ? 'Entering...' : 'Instant Demo'}</span>
            </button>

            <button
              onClick={() => setCurrentPage('login')}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#1677FF] hover:bg-[#125ecc] text-white text-xs font-semibold shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-[#1677FF]/20 cursor-pointer"
            >
              <span>Log In</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </header>

      {/* 2. HERO SECTION */}
      <section className="relative pt-12 pb-16 sm:pt-20 sm:pb-24 border-b border-[#E5E7EB] bg-gradient-to-b from-white to-[#F5F6F8] flex-1">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
          {/* Compliance Pill */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono font-medium bg-[#E6F4FF] text-[#1677FF] border border-[#1677FF]/20 shadow-2xs">
            <ShieldCheck className="w-3.5 h-3.5 text-[#1677FF]" />
            <span>NIST SP 800-61 • FDA IoMT Premarket/Postmarket Mandate</span>
          </div>

          {/* Main Title */}
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-[#171717] leading-[1.15]">
            Defensive Security &amp; Privacy for Connected Medical Devices
          </h1>

          {/* Subtitle */}
          <p className="max-w-2xl mx-auto text-sm sm:text-base text-[#4B5563] leading-relaxed">
            MediShield safeguards clinical healthcare environments with authorized vulnerability scanning, ML-driven intrusion detection, continuous IoMT telemetry monitoring, and cryptographically sealed audit reporting.
          </p>

          {/* CTA Group */}
          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={() => setCurrentPage('login')}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-[#1677FF] hover:bg-[#125ecc] text-white text-sm font-semibold shadow-md transition-all cursor-pointer"
            >
              <Lock className="w-4 h-4" />
              <span>Log In to Operations Center</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              onClick={() => handleQuickLogin('analyst')}
              disabled={loggingInRole !== null}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 rounded-lg bg-white border border-[#E5E7EB] hover:bg-[#F9FAFB] text-neutral-800 text-sm font-medium transition-swiss shadow-xs cursor-pointer"
            >
              <UserCheck className="w-4 h-4 text-[#10B981]" />
              <span>Explore as Security Analyst</span>
            </button>
          </div>

          {/* Live Telemetry Highlights Strip */}
          <div className="pt-10 grid grid-cols-2 md:grid-cols-4 gap-4 text-left">
            <div className="p-4 bg-white border border-[#E5E7EB] rounded-lg shadow-2xs">
              <p className="text-[11px] font-mono uppercase text-[#6B7280]">Monitored Assets</p>
              <p className="text-2xl font-bold text-[#171717] mt-1 tabular-nums">{devices?.length ? `${devices.length} Assets` : '6 Clinical Assets'}</p>
              <p className="text-[11px] text-[#10B981] flex items-center gap-1 mt-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]" /> ICU, OR, Ward VLANs
              </p>
            </div>
            <div className="p-4 bg-white border border-[#E5E7EB] rounded-lg shadow-2xs">
              <p className="text-[11px] font-mono uppercase text-[#6B7280]">ML Threat Detection</p>
              <p className="text-2xl font-bold text-[#171717] mt-1 tabular-nums">{mlModel?.accuracy || '98.5% Acc.'}</p>
              <p className="text-[11px] text-[#6B7280] mt-1">UNB CICIoMT2024</p>
            </div>
            <div className="p-4 bg-white border border-[#E5E7EB] rounded-lg shadow-2xs">
              <p className="text-[11px] font-mono uppercase text-[#6B7280]">Scanner Engines</p>
              <p className="text-2xl font-bold text-[#171717] mt-1">14 Tools</p>
              <p className="text-[11px] text-[#6B7280] mt-1">Nmap • OpenVAS • Nuclei • ZAP</p>
            </div>
            <div className="p-4 bg-white border border-[#E5E7EB] rounded-lg shadow-2xs">
              <p className="text-[11px] font-mono uppercase text-[#6B7280]">Audit Chain</p>
              <p className="text-2xl font-bold text-[#171717] mt-1">SHA-256</p>
              <p className="text-[11px] text-[#1677FF] mt-1">Tamper-evident sealed</p>
            </div>
          </div>
        </div>
      </section>

      {/* 3. FOOTER */}
      <footer className="bg-white py-10 border-t border-[#E5E7EB]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#6B7280]">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded bg-[#1677FF] text-white flex items-center justify-center text-[10px] font-bold">
              <Shield className="w-3 h-3" />
            </div>
            <span className="font-semibold text-[#171717]">MediShield Platform v2.0</span>
            <span>• IoMT Cybersecurity &amp; Privacy</span>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => setCurrentPage('login')}
              className="text-[#1677FF] hover:underline font-medium cursor-pointer"
            >
              Sign In to Platform
            </button>
            <a
              href="http://127.0.0.1:8000/docs"
              target="_blank"
              rel="noreferrer"
              className="hover:text-[#171717] flex items-center gap-1"
            >
              <span>FastAPI Docs</span>
              <ExternalLink className="w-3 h-3" />
            </a>
            <a
              href="https://github.com/ANIKETCHAND/Msec"
              target="_blank"
              rel="noreferrer"
              className="hover:text-[#171717] flex items-center gap-1"
            >
              <span>GitHub</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
