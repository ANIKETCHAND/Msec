import React, { useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import DashboardLayout from './layouts/DashboardLayout';
import Phase1VerificationPage from './pages/Phase1VerificationPage';

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

function MainRouter({ showPhase2Dashboard, setShowPhase2Dashboard }) {
  const { currentPage } = useApp();

  if (!showPhase2Dashboard) {
    return <Phase1VerificationPage onSwitchToDashboard={() => setShowPhase2Dashboard(true)} />;
  }

  if (currentPage === 'login') {
    return <LoginPage />;
  }

  return (
    <div>
      {/* Top Banner showing Phase 2 Preview Mode */}
      <div className="bg-navy-900 border-b border-navy-700 px-4 py-2 flex items-center justify-between text-xs text-slate-300">
        <span className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
          <strong>Phase 2 Preview Mode:</strong> All pages and mock components preserved. Official Phase 2 development pending user approval.
        </span>
        <button
          onClick={() => setShowPhase2Dashboard(false)}
          className="text-mediblue-400 hover:text-mediblue-300 font-medium underline transition"
        >
          Return to Phase 1 Foundation View
        </button>
      </div>

      <DashboardLayout>
        {currentPage === 'dashboard' && <DashboardPage />}
        {currentPage === 'devices' && <DeviceInventoryPage />}
        {currentPage === 'device-detail' && <DeviceDetailPage />}
        {currentPage === 'security-events' && <SecurityEventsPage />}
        {currentPage === 'incidents' && <IncidentManagementPage />}
        {currentPage === 'ml-detection' && <MLDetectionPage />}
        {currentPage === 'integrity' && <PrivacyIntegrityPage />}
        {currentPage === 'audit-logs' && <AuditLogsPage />}
        {currentPage === 'reports' && <ReportsPage />}
        {currentPage === 'settings' && <SettingsPage />}
      </DashboardLayout>
    </div>
  );
}

export default function App() {
  const [showPhase2Dashboard, setShowPhase2Dashboard] = useState(true);

  return (
    <AppProvider>
      <MainRouter
        showPhase2Dashboard={showPhase2Dashboard}
        setShowPhase2Dashboard={setShowPhase2Dashboard}
      />
    </AppProvider>
  );
}
