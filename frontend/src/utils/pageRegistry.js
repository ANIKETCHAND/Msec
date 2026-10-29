import {
  LayoutDashboard,
  Server,
  Activity,
  Shield,
  ShieldCheck,
  Wrench,
  Network,
  SlidersHorizontal,
  AlertTriangle,
  FileText,
  Brain,
  BarChart3,
  ClipboardList,
  Lock,
  Settings as SettingsIcon
} from 'lucide-react';

export const PAGE_REGISTRY = {
  dashboard: {
    id: 'dashboard',
    title: 'Security Dashboard',
    subtitle: 'IoMT Operations & Clinical Risk Posture',
    color: '#1677FF',
    icon: LayoutDashboard,
    category: 'OVERVIEW'
  },
  devices: {
    id: 'devices',
    title: 'Device Inventory',
    subtitle: 'Monitored Clinical Assets & Segments',
    color: '#10B981',
    icon: Server,
    category: 'ASSET SECURITY'
  },
  'device-detail': {
    id: 'device-detail',
    title: 'Device Diagnostics',
    subtitle: 'Real-Time Telemetry & Microsegmentation',
    color: '#06B6D4',
    icon: Activity,
    category: 'ASSET SECURITY'
  },
  'devices-scan': {
    id: 'devices-scan',
    title: 'Devices & Scan',
    subtitle: 'Authorized Asset Selection & Defensive Assessment',
    color: '#1677FF',
    icon: Shield,
    category: 'CORE WORKFLOW'
  },
  'assessment-center': {
    id: 'assessment-center',
    title: 'Assessment Center',
    subtitle: 'IoMT Security & Compliance Posture Center',
    color: '#1677FF',
    icon: Shield,
    category: 'CORE WORKFLOW'
  },
  'scan-results': {
    id: 'scan-results',
    title: 'Scan Results',
    subtitle: 'Verified Findings, Evidence Inspector & Limitations',
    color: '#10B981',
    icon: ShieldCheck,
    category: 'CORE WORKFLOW'
  },
  topology: {
    id: 'topology',
    title: 'Network Topology',
    subtitle: 'Clinical VLAN Segments & Healthcare Gateway',
    color: '#3B82F6',
    icon: Network,
    category: 'ASSET SECURITY'
  },
  tools: {
    id: 'tools',
    title: 'Security Tools',
    subtitle: 'Defensive Scanner Engines & Passive IDS Sensors',
    color: '#64748B',
    icon: Wrench,
    category: 'ASSET SECURITY'
  },
  'response-simulator': {
    id: 'response-simulator',
    title: 'Response Simulator',
    subtitle: 'Clinical Patient Safety Sandbox Containment',
    color: '#F97316',
    icon: SlidersHorizontal,
    category: 'ASSET SECURITY'
  },
  'security-events': {
    id: 'security-events',
    title: 'Security Events',
    subtitle: 'Real-Time Detection & Event Correlation Stream',
    color: '#EF4444',
    icon: AlertTriangle,
    category: 'MONITORING'
  },
  incidents: {
    id: 'incidents',
    title: 'Incident Management',
    subtitle: 'Active Clinical Alerts, Containment & Remediation',
    color: '#F59E0B',
    icon: AlertTriangle,
    category: 'MONITORING'
  },
  'ml-detection': {
    id: 'ml-detection',
    title: 'ML Attack Detection',
    subtitle: 'Random Forest IoMT Classifier & Real-Time Inference',
    color: '#8B5CF6',
    icon: Brain,
    category: 'MONITORING'
  },
  'phase1-verify': {
    id: 'phase1-verify',
    title: 'Phase 1 Verification',
    subtitle: 'Architecture & System Integrity Benchmark',
    color: '#06B6D4',
    icon: ShieldCheck,
    category: 'GOVERNANCE'
  },
  reports: {
    id: 'reports',
    title: 'Security Reports',
    subtitle: 'IoMT Posture & Compliance Summary Exports',
    color: '#2563EB',
    icon: BarChart3,
    category: 'GOVERNANCE'
  },
  'audit-logs': {
    id: 'audit-logs',
    title: 'Audit Logs',
    subtitle: 'SHA-256 Cryptographic Hash Chain Ledger',
    color: '#475569',
    icon: ClipboardList,
    category: 'GOVERNANCE'
  },
  integrity: {
    id: 'integrity',
    title: 'Privacy & Integrity',
    subtitle: 'AES-256-GCM & Deterministic SHA-256 Verification',
    color: '#4F46E5',
    icon: Lock,
    category: 'GOVERNANCE'
  },
  settings: {
    id: 'settings',
    title: 'System Settings',
    subtitle: 'Detection Thresholds & Platform Environment',
    color: '#6B7280',
    icon: SettingsIcon,
    category: 'SYSTEM'
  },
};
