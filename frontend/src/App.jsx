import React from 'react';
import { AppProvider, useApp } from './context/AppContext';
import WorkspaceShell from './layouts/WorkspaceShell';
import PageStack from './components/stack/PageStack';

import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import DeviceInventoryPage from './pages/DeviceInventoryPage';
import DeviceDetailPage from './pages/DeviceDetailPage';
import SecurityEventsPage from './pages/SecurityEventsPage';
import PrivacyIntegrityPage from './pages/PrivacyIntegrityPage';
import AuditLogsPage from './pages/AuditLogsPage';
import ReportsPage from './pages/ReportsPage';
import SettingsPage from './pages/SettingsPage';
import AssessmentCenterPage from './pages/AssessmentCenterPage';
import ToolsManagementPage from './pages/ToolsManagementPage';
import NetworkTopologyPage from './pages/NetworkTopologyPage';
import ResponseSimulatorPage from './pages/ResponseSimulatorPage';

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
    devices: <DeviceInventoryPage />,
    'device-detail': <DeviceDetailPage />,
    'assessment-center': <AssessmentCenterPage />,
    topology: <NetworkTopologyPage />,
    tools: <ToolsManagementPage />,
    'response-simulator': <ResponseSimulatorPage />,
    'security-events': <SecurityEventsPage />,
    integrity: <PrivacyIntegrityPage />,
    'audit-logs': <AuditLogsPage />,
    reports: <ReportsPage />,
    settings: <SettingsPage />,
  };

  return (
    <WorkspaceShell>
      <PageStack pageMap={pageMap} />
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
