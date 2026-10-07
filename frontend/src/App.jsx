import React from 'react';
import { AppProvider, useApp } from './context/AppContext';
import DashboardLayout from './layouts/DashboardLayout';

import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import DeviceInventoryPage from './pages/DeviceInventoryPage';
import DeviceDetailPage from './pages/DeviceDetailPage';
import SecurityEventsPage from './pages/SecurityEventsPage';
import IncidentManagementPage from './pages/IncidentManagementPage';
import MLDetectionPage from './pages/MLDetectionPage';
import PrivacyIntegrityPage from './pages/PrivacyIntegrityPage';
import AuditLogsPage from './pages/AuditLogsPage';
import ReportsPage from './pages/ReportsPage';
import SettingsPage from './pages/SettingsPage';
import AssessmentCenterPage from './pages/AssessmentCenterPage';
import ToolsManagementPage from './pages/ToolsManagementPage';
import NetworkTopologyPage from './pages/NetworkTopologyPage';
import ResponseSimulatorPage from './pages/ResponseSimulatorPage';
import AIAssistantWidget from './components/AIAssistantWidget';

function MainRouter() {
  const { currentPage } = useApp();

  if (currentPage === 'login') {
    return <LoginPage />;
  }

  return (
    <DashboardLayout>
      {currentPage === 'dashboard' && <DashboardPage />}
      {currentPage === 'devices' && <DeviceInventoryPage />}
      {currentPage === 'device-detail' && <DeviceDetailPage />}
      {currentPage === 'assessment-center' && <AssessmentCenterPage />}
      {currentPage === 'topology' && <NetworkTopologyPage />}
      {currentPage === 'tools' && <ToolsManagementPage />}
      {currentPage === 'response-simulator' && <ResponseSimulatorPage />}
      {currentPage === 'security-events' && <SecurityEventsPage />}
      {currentPage === 'incidents' && <IncidentManagementPage />}
      {currentPage === 'ml-detection' && <MLDetectionPage />}
      {currentPage === 'integrity' && <PrivacyIntegrityPage />}
      {currentPage === 'audit-logs' && <AuditLogsPage />}
      {currentPage === 'reports' && <ReportsPage />}
      {currentPage === 'settings' && <SettingsPage />}

      <AIAssistantWidget />
    </DashboardLayout>
  );
}

export default function App() {
  return (
    <AppProvider>
      <MainRouter />
    </AppProvider>
  );
}
