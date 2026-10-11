import {
  LayoutDashboard,
  Server,
  Activity,
  Shield,
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
  dashboard: { id: 'dashboard', title: 'Dashboard', icon: LayoutDashboard, category: 'OVERVIEW' },
  devices: { id: 'devices', title: 'Devices', icon: Server, category: 'ASSET SECURITY' },
  topology: { id: 'topology', title: 'Network Topology', icon: Network, category: 'ASSET SECURITY' },
  'assessment-center': { id: 'assessment-center', title: 'Assessment Center', icon: Shield, category: 'ASSET SECURITY' },
  tools: { id: 'tools', title: 'Security Tools', icon: Wrench, category: 'ASSET SECURITY' },
  'response-simulator': { id: 'response-simulator', title: 'Response Simulator', icon: SlidersHorizontal, category: 'ASSET SECURITY' },
  'device-detail': { id: 'device-detail', title: 'Device Diagnostics', icon: Activity, category: 'ASSET SECURITY' },
  'security-events': { id: 'security-events', title: 'Security Events', icon: AlertTriangle, category: 'MONITORING' },
  incidents: { id: 'incidents', title: 'Incident Management', icon: FileText, category: 'MONITORING' },
  'ml-detection': { id: 'ml-detection', title: 'ML Threat Engine', icon: Brain, category: 'MONITORING' },
  reports: { id: 'reports', title: 'Security Reports', icon: BarChart3, category: 'GOVERNANCE' },
  'audit-logs': { id: 'audit-logs', title: 'Audit Logs', icon: ClipboardList, category: 'GOVERNANCE' },
  integrity: { id: 'integrity', title: 'Privacy', icon: Lock, category: 'GOVERNANCE' },
  settings: { id: 'settings', title: 'System Settings', icon: SettingsIcon, category: 'SYSTEM' },
};
