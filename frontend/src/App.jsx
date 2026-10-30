import React, { Suspense, lazy } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import WorkspaceShell from './layouts/WorkspaceShell';
import PageStack from './components/stack/PageStack';

// Entry screens ship in the core bundle; workspace pages load on demand so the
// first paint is not blocked by charts, tables and topology rendering code.
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';

const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const DeviceInventoryPage = lazy(() => import('./pages/DeviceInventoryPage'));
const DeviceDetailPage = lazy(() => import('./pages/DeviceDetailPage'));
const SecurityEventsPage = lazy(() => import('./pages/SecurityEventsPage'));
const PrivacyIntegrityPage = lazy(() => import('./pages/PrivacyIntegrityPage'));
const AuditLogsPage = lazy(() => import('./pages/AuditLogsPage'));
const ReportsPage = lazy(() => import('./pages/ReportsPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const AssessmentCenterPage = lazy(() => import('./pages/AssessmentCenterPage'));
const DevicesScanPage = lazy(() => import('./pages/DevicesScanPage'));
const ScanResultsPage = lazy(() => import('./pages/ScanResultsPage'));
const ToolsManagementPage = lazy(() => import('./pages/ToolsManagementPage'));
const NetworkTopologyPage = lazy(() => import('./pages/NetworkTopologyPage'));
const ResponseSimulatorPage = lazy(() => import('./pages/ResponseSimulatorPage'));
const IncidentManagementPage = lazy(() => import('./pages/IncidentManagementPage'));
const MLDetectionPage = lazy(() => import('./pages/MLDetectionPage'));
const Phase1VerificationPage = lazy(() => import('./pages/Phase1VerificationPage'));

function WorkspaceLoading() {
  return (
    <div className="flex-1 min-h-0 flex items-center justify-center border border-[#E5E7EB] rounded-2xl bg-white">
      <span className="text-xs font-mono text-[#6B7280]">Loading workspace…</span>
    </div>
  );
}

function MainRouter() {
  const { currentPage, currentUser } = useApp();

  if (currentPage === 'landing' || (!currentUser && currentPage !== 'login')) {
    return <LandingPage />;
  }

  if (currentPage === 'login') {
    return <LoginPage />;
  }

  // Registry map of all functional pages for stacked workspace
  const pageMap = {
    dashboard: <DashboardPage />,
    'devices-scan': <DevicesScanPage />,
    'assessment-center': <AssessmentCenterPage />,
    'scan-results': <ScanResultsPage />,
    reports: <ReportsPage />,
    devices: <DeviceInventoryPage />,
    'device-detail': <DeviceDetailPage />,
    topology: <NetworkTopologyPage />,
    tools: <ToolsManagementPage />,
    'response-simulator': <ResponseSimulatorPage />,
    'security-events': <SecurityEventsPage />,
    incidents: <IncidentManagementPage />,
    'ml-detection': <MLDetectionPage />,
    'phase1-verify': <Phase1VerificationPage />,
    integrity: <PrivacyIntegrityPage />,
    'audit-logs': <AuditLogsPage />,
    settings: <SettingsPage />,
  };

  return (
    <WorkspaceShell>
      <Suspense fallback={<WorkspaceLoading />}>
        <PageStack pageMap={pageMap} />
      </Suspense>
    </WorkspaceShell>
  );
}

export default function App() {
  return (
    <AppProvider>
      <MainRouter />
    </AppProvider>
  );
}
