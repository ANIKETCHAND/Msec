import React, { useState } from 'react';
import { useApp, DEMO_USERS } from '../context/AppContext';
import { api } from '../services/api';
import {
  Shield,
  ShieldCheck,
  Lock,
  ArrowRight,
  Server,
  Activity,
  Cpu,
  FileText,
  AlertTriangle,
  Layers,
  CheckCircle2,
  ExternalLink,
  ChevronRight,
  Sparkles,
  UserCheck,
  Check,
  Terminal,
  FileCheck,
  HeartPulse,
  Eye,
  Zap
} from 'lucide-react';
import CyberFace3D from '../components/landing/CyberFace3D';

export default function LandingPage() {
  const { setCurrentUser, setCurrentPage, logAudit } = useApp();
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

  const workflowSteps = [
    { num: '01', title: 'Asset Scope Authorization', desc: 'Clinical assets enrolled in strict bounded scope certificates before any scans.' },
    { num: '02', title: 'Defensive Multi-Tool Scan', desc: 'Orchestrates non-destructive Nmap, OpenVAS, Nuclei, Nikto, and OWASP ZAP.' },
    { num: '03', title: 'CVSS & Risk Scoring', desc: 'Enriches findings with vulnerability databases and clinical device criticality weights.' },
    { num: '04', title: 'Cryptographic Reports', desc: 'Generates publication-grade ReportLab PDF & sanitized Jinja2 HTML with SHA-256 seal.' },
    { num: '05', title: 'Passive Threat Detection', desc: 'Suricata EVE, Zeek logs, and CICIoMT2024 Random Forest ML real-time inference.' },
    { num: '06', title: 'Forensic Incident Triage', desc: 'Full incident lifecycle, persistent analyst notes, and multi-stage attack correlation.' }
  ];

  const platformCapabilities = [
    {
      icon: Server,
      title: 'Clinical Asset Inventory',
      desc: 'Real-time discovery and microsegmentation monitoring across ICU, ER, OR, and Radiology VLANs.'
    },
    {
      icon: Shield,
      title: 'Assessment Center',
      desc: 'Operator-signed, time-limited defensive vulnerability assessments strictly bounded by clinical safety rules.'
    },
    {
      icon: Cpu,
      title: 'ML Threat Analytics',
      desc: 'Authentic Random Forest inference trained on UNB CICIoMT2024 dataset for medical protocol anomaly detection.'
    },
    {
      icon: FileText,
      title: 'Dual Security Reports',
      desc: 'Executive PDF summaries and standalone HTML audit reports with tamper-evident SHA-256 cryptographic seals.'
    },
    {
      icon: AlertTriangle,
      title: 'Incident Queue & Notes',
      desc: 'Collaborative analyst investigation tickets with persistent notes, remediation tracking, and containment.'
    },
    {
      icon: Lock,
      title: 'SHA-256 Audit Chain',
      desc: 'Cryptographic block-style hash chaining ensuring complete non-repudiation and drift detection.'
    }
  ];

  return (
    <div className="min-h-screen bg-[#F5F6F8] text-[#171717] font-sans flex flex-col selection:bg-[#1677FF] selection:text-white">
      {/* 1. TOP NAVIGATION BAR */}
      <header className="sticky top-0 z-50 bg-[#060B18]/90 backdrop-blur-md border-b border-white/10 transition-all text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Logo & Identity */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#1677FF] text-white flex items-center justify-center font-bold text-sm shadow-md shadow-blue-500/30">
              <Shield className="w-5 h-5 stroke-[2.25]" />
            </div>
            <div>
              <div className="flex items-baseline gap-2">
                <span className="font-bold text-base tracking-tight text-white">MediShield</span>
                <span className="text-[11px] font-mono font-medium text-cyan-300 bg-cyan-950/80 border border-cyan-500/30 px-1.5 py-0.2 rounded">v2.0</span>
              </div>
              <p className="text-[10px] text-neutral-400 font-mono leading-none hidden sm:block">IoMT Security &amp; Privacy Platform</p>
            </div>
          </div>

          {/* Center Links */}
          <nav className="hidden md:flex items-center gap-6 text-xs font-medium text-neutral-300">
            <a href="#workflow" className="hover:text-white transition-swiss">Guided Workflow</a>
            <a href="#capabilities" className="hover:text-white transition-swiss">Capabilities</a>
            <a href="#personas" className="hover:text-white transition-swiss">RBAC Personas</a>
            <a href="#safety" className="hover:text-white transition-swiss">Clinical Safety</a>
          </nav>

          {/* Right Action: Log In Button */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => handleQuickLogin('analyst')}
              disabled={loggingInRole !== null}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/15 bg-white/5 hover:bg-white/10 text-xs font-medium text-neutral-200 transition-swiss cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#F59E0B]" />
              <span>{loggingInRole === 'analyst' ? 'Entering...' : 'Instant Demo'}</span>
            </button>

            <button
              onClick={() => setCurrentPage('login')}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#1677FF] hover:bg-[#125ecc] text-white text-xs font-semibold shadow-md shadow-blue-500/25 transition-all focus:outline-none focus:ring-2 focus:ring-[#1677FF]/40 cursor-pointer"
            >
              <span>Sign In</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </header>

      {/* 2. HERO SECTION WITH 3D CYBER FACE IN FULL BACKGROUND */}
      <section className="relative min-h-[90vh] flex flex-col justify-between pt-14 pb-14 sm:pt-20 sm:pb-16 bg-[#060B18] text-white overflow-hidden border-b border-white/10">
        
        {/* Full 3D Face Animation in the Background */}
        <CyberFace3D />

        {/* Ambient subtle cyber grid lines & radial vignette for cinematic depth */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none" />
        <div className="absolute inset-0 bg-radial from-transparent via-[#060B18]/60 to-[#060B18] pointer-events-none" />

        {/* Foreground Content: Centered over the 3D Face */}
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10 flex flex-col items-center justify-center flex-1 space-y-6">
          
          {/* Compliance Pill */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-mono font-medium bg-[#1677FF]/15 text-cyan-300 border border-cyan-500/30 backdrop-blur-md shadow-lg shadow-cyan-950/40">
            <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
            <span>NIST SP 800-61 • FDA IoMT Premarket/Postmarket Mandate</span>
          </div>

          {/* Main Hero Title */}
          <h1 className="text-4xl sm:text-6xl lg:text-[68px] font-extrabold tracking-tight text-white leading-[1.08] drop-shadow-[0_4px_24px_rgba(0,0,0,0.8)]">
            DEFENSIVE SECURITY &amp; PRIVACY FOR CONNECTED MEDICAL DEVICES
          </h1>

          {/* Subtitle */}
          <p className="max-w-3xl mx-auto text-sm sm:text-base text-neutral-300 leading-relaxed drop-shadow-[0_2px_12px_rgba(0,0,0,0.8)]">
            MediShield safeguards clinical healthcare environments with authorized vulnerability scanning, ML-driven intrusion detection, continuous IoMT telemetry monitoring, and cryptographically sealed audit reporting.
          </p>

          {/* Center Call to Action Buttons */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3 w-full sm:w-auto">
            <button
              onClick={() => setCurrentPage('login')}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-8 py-3.5 rounded-lg bg-[#1677FF] hover:bg-[#125ecc] text-white text-sm font-bold shadow-lg shadow-blue-600/40 transition-all hover:scale-[1.02] cursor-pointer"
            >
              <Lock className="w-4 h-4" />
              <span>ENTER OPERATIONS CENTER / SIGN IN</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              onClick={() => handleQuickLogin('analyst')}
              disabled={loggingInRole !== null}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-lg bg-white/10 hover:bg-white/15 border border-white/20 text-white text-sm font-semibold backdrop-blur-md transition-all cursor-pointer"
            >
              <UserCheck className="w-4 h-4 text-emerald-400" />
              <span>Explore as Security Analyst</span>
            </button>
          </div>

          {/* Centered Command Protocol Box (Reflects FitTrack reference layout) */}
          <div className="w-full max-w-2xl mt-4 p-4 rounded-xl bg-[#091124]/85 border border-cyan-500/30 backdrop-blur-lg shadow-xl text-left">
            <div className="flex items-center justify-between text-[11px] font-mono pb-2 border-b border-cyan-500/20 text-cyan-400">
              <span className="flex items-center gap-1.5 font-bold">
                <Zap className="w-3.5 h-3.5 text-cyan-400" />
                CLINICAL DEFENSE PROTOCOL // BOUNDED ASSESSMENT
              </span>
              <span className="text-neutral-400 font-normal hidden sm:inline">— NIST SP 800-61 COMPLIANT</span>
            </div>
            <p className="mt-2 text-xs sm:text-sm font-mono text-neutral-200 leading-relaxed">
              &ldquo;Continuous medical device telemetry verification • Zero patient care disruption guaranteed • All clinical scans pre-authorized with cryptographic certificates.&rdquo;
            </p>
          </div>

          {/* Live Telemetry Highlights Strip (4 Cards across the bottom of the hero) */}
          <div className="w-full pt-6 grid grid-cols-2 md:grid-cols-4 gap-4 text-left">
            <div className="p-4 bg-[#091124]/80 border border-white/10 rounded-lg backdrop-blur-md shadow-md hover:border-cyan-500/40 transition-swiss">
              <p className="text-[11px] font-mono uppercase text-cyan-400">01 / Monitored Assets</p>
              <p className="text-2xl font-bold text-white mt-1 tabular-nums">64 Devices</p>
              <p className="text-[11px] text-emerald-400 flex items-center gap-1 mt-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> ICU, OR, Ward VLANs
              </p>
            </div>
            <div className="p-4 bg-[#091124]/80 border border-white/10 rounded-lg backdrop-blur-md shadow-md hover:border-cyan-500/40 transition-swiss">
              <p className="text-[11px] font-mono uppercase text-cyan-400">02 / ML Detection</p>
              <p className="text-2xl font-bold text-white mt-1 tabular-nums">99.8% Acc.</p>
              <p className="text-[11px] text-neutral-400 mt-1">UNB CICIoMT2024</p>
            </div>
            <div className="p-4 bg-[#091124]/80 border border-white/10 rounded-lg backdrop-blur-md shadow-md hover:border-cyan-500/40 transition-swiss">
              <p className="text-[11px] font-mono uppercase text-cyan-400">03 / Defensive Scanners</p>
              <p className="text-2xl font-bold text-white mt-1">14 Tools</p>
              <p className="text-[11px] text-neutral-400 mt-1">Nmap • OpenVAS • Nuclei • ZAP</p>
            </div>
            <div className="p-4 bg-[#091124]/80 border border-white/10 rounded-lg backdrop-blur-md shadow-md hover:border-cyan-500/40 transition-swiss">
              <p className="text-[11px] font-mono uppercase text-cyan-400">04 / Crypto Audit</p>
              <p className="text-2xl font-bold text-white mt-1">SHA-256</p>
              <p className="text-[11px] text-cyan-300 mt-1">Tamper-evident sealed</p>
            </div>
          </div>

        </div>
      </section>

      {/* 3. GUIDED 18-STEP USER WORKFLOW */}
      <section id="workflow" className="py-16 bg-white border-b border-[#E5E7EB]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mb-12">
            <span className="text-xs font-mono font-semibold uppercase text-[#1677FF] tracking-wider">
              Single Guided Operational Journey
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-[#171717] mt-1">
              End-to-End Clinical IoMT Security Workflow
            </h2>
            <p className="text-xs sm:text-sm text-[#6B7280] mt-2 leading-relaxed">
              From operator authorization and defensive multi-tool scanning to normalized CVSS scoring and cryptographic audit trail verification.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {workflowSteps.map((step) => (
              <div
                key={step.num}
                className="p-5 rounded-lg border border-[#E5E7EB] bg-[#FAFAFA] hover:bg-white hover:border-[#1677FF] transition-swiss shadow-2xs group"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-mono font-bold text-[#1677FF] bg-[#E6F4FF] px-2 py-0.5 rounded">
                    STEP {step.num}
                  </span>
                  <CheckCircle2 className="w-4 h-4 text-[#9CA3AF] group-hover:text-[#10B981] transition-swiss" />
                </div>
                <h3 className="text-sm font-semibold text-[#171717] mb-1.5">{step.title}</h3>
                <p className="text-xs text-[#6B7280] leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 4. PLATFORM CAPABILITIES */}
      <section id="capabilities" className="py-16 bg-[#F5F6F8] border-b border-[#E5E7EB]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mb-12">
            <span className="text-xs font-mono font-semibold uppercase text-[#1677FF] tracking-wider">
              Core Modules
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-[#171717] mt-1">
              Enterprise Defensive Security Architecture
            </h2>
            <p className="text-xs sm:text-sm text-[#6B7280] mt-2 leading-relaxed">
              Engineered exclusively for healthcare delivery organizations requiring zero downtime and patient vital safety.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {platformCapabilities.map((cap) => {
              const Icon = cap.icon;
              return (
                <div key={cap.title} className="p-6 bg-white border border-[#E5E7EB] rounded-lg shadow-xs hover:border-[#1677FF]/50 transition-swiss">
                  <div className="w-9 h-9 rounded-md bg-[#E6F4FF] text-[#1677FF] flex items-center justify-center mb-4">
                    <Icon className="w-5 h-5 stroke-[2]" />
                  </div>
                  <h3 className="text-sm font-semibold text-[#171717] mb-2">{cap.title}</h3>
                  <p className="text-xs text-[#6B7280] leading-relaxed">{cap.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 5. RBAC PERSONA DEMO SELECTOR */}
      <section id="personas" className="py-16 bg-white border-b border-[#E5E7EB]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="text-xs font-mono font-semibold uppercase text-[#1677FF] tracking-wider">
              Role-Based Access Control
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-[#171717] mt-1">
              Select Demo Persona to Evaluate MediShield
            </h2>
            <p className="text-xs sm:text-sm text-[#6B7280] mt-2 leading-relaxed">
              Experience the platform through distinct role permissions with verified backend access tokens.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {/* Analyst */}
            <div className="p-6 rounded-lg border-2 border-[#1677FF] bg-[#F0F7FF] flex flex-col justify-between shadow-xs">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#1677FF] text-white">
                    RECOMMENDED
                  </span>
                  <span className="text-xs font-mono text-[#1677FF]">SOC Operations</span>
                </div>
                <h3 className="text-base font-bold text-[#171717]">{DEMO_USERS.analyst.name}</h3>
                <p className="text-xs font-mono text-[#6B7280] mt-0.5">{DEMO_USERS.analyst.email}</p>
                <div className="mt-4 space-y-2 text-xs text-[#4B5563]">
                  <p className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-[#1677FF]" /> Authorize defensive scan scopes</p>
                  <p className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-[#1677FF]" /> Execute multi-tool scans</p>
                  <p className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-[#1677FF]" /> Generate signed PDF &amp; HTML reports</p>
                  <p className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-[#1677FF]" /> Write persistent incident triage notes</p>
                </div>
              </div>
              <button
                onClick={() => handleQuickLogin('analyst')}
                disabled={loggingInRole !== null}
                className="mt-6 w-full py-2.5 px-4 rounded-lg bg-[#1677FF] hover:bg-[#125ecc] text-white text-xs font-semibold shadow-xs flex items-center justify-center gap-2 transition-swiss cursor-pointer"
              >
                <span>{loggingInRole === 'analyst' ? 'Signing in...' : 'Sign In as Security Analyst'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Admin */}
            <div className="p-6 rounded-lg border border-[#E5E7EB] bg-white flex flex-col justify-between shadow-xs hover:border-[#1677FF] transition-swiss">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold font-mono bg-purple-50 text-purple-700 border border-purple-200">
                    ADMINISTRATOR
                  </span>
                  <span className="text-xs font-mono text-[#6B7280]">Full Control</span>
                </div>
                <h3 className="text-base font-bold text-[#171717]">{DEMO_USERS.admin.name}</h3>
                <p className="text-xs font-mono text-[#6B7280] mt-0.5">{DEMO_USERS.admin.email}</p>
                <div className="mt-4 space-y-2 text-xs text-[#4B5563]">
                  <p className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-[#10B981]" /> Register new clinical IoMT assets</p>
                  <p className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-[#10B981]" /> Configure institutional security policies</p>
                  <p className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-[#10B981]" /> Verify cryptographic audit hash chain</p>
                  <p className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-[#10B981]" /> Full incident governance privileges</p>
                </div>
              </div>
              <button
                onClick={() => handleQuickLogin('admin')}
                disabled={loggingInRole !== null}
                className="mt-6 w-full py-2.5 px-4 rounded-lg bg-[#171717] hover:bg-neutral-800 text-white text-xs font-semibold shadow-xs flex items-center justify-center gap-2 transition-swiss cursor-pointer"
              >
                <span>{loggingInRole === 'admin' ? 'Signing in...' : 'Sign In as Administrator'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Doctor */}
            <div className="p-6 rounded-lg border border-[#E5E7EB] bg-white flex flex-col justify-between shadow-xs hover:border-[#1677FF] transition-swiss">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold font-mono bg-emerald-50 text-emerald-700 border border-emerald-200">
                    CLINICAL PHYSICIAN
                  </span>
                  <span className="text-xs font-mono text-[#6B7280]">Patient Care</span>
                </div>
                <h3 className="text-base font-bold text-[#171717]">{DEMO_USERS.doctor.name}</h3>
                <p className="text-xs font-mono text-[#6B7280] mt-0.5">{DEMO_USERS.doctor.email}</p>
                <div className="mt-4 space-y-2 text-xs text-[#4B5563]">
                  <p className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-[#10B981]" /> Real-time patient telemetry monitoring</p>
                  <p className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-[#10B981]" /> Ventilator, pump, and vitals diagnostics</p>
                  <p className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-[#10B981]" /> Read-only clinical privacy boundary</p>
                  <p className="flex items-center gap-2 text-[#9CA3AF]">✕ Restricted from offensive tool execution</p>
                </div>
              </div>
              <button
                onClick={() => handleQuickLogin('doctor')}
                disabled={loggingInRole !== null}
                className="mt-6 w-full py-2.5 px-4 rounded-lg border border-[#E5E7EB] hover:bg-[#F9FAFB] text-[#171717] text-xs font-semibold shadow-2xs flex items-center justify-center gap-2 transition-swiss cursor-pointer"
              >
                <span>{loggingInRole === 'doctor' ? 'Signing in...' : 'Sign In as Doctor'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 6. ETHICAL SAFETY & CLINICAL MANDATE */}
      <section id="safety" className="py-14 bg-[#FAFAFA] border-b border-[#E5E7EB]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-4">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded bg-amber-50 text-amber-800 border border-amber-200 text-xs font-mono font-medium">
            <HeartPulse className="w-3.5 h-3.5 text-amber-600" />
            <span>PATIENT LIFE SAFETY FIRST • ZERO DISRUPTION GUARANTEE</span>
          </div>
          <h3 className="text-xl font-bold text-[#171717]">
            Defensive Security With Strict Guardrails
          </h3>
          <p className="text-xs text-[#6B7280] leading-relaxed max-w-2xl mx-auto">
            MediShield strictly prohibits denial-of-service payloads, brute-force disruption, or unverified automated interventions against operational clinical hardware. All scans are pre-authorized with time-bounded cryptographic certificates.
          </p>
        </div>
      </section>

      {/* 7. FOOTER */}
      <footer className="bg-white py-10 mt-auto">
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
