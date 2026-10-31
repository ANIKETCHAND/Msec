/**
 * MediShield Core Application State Provider.
 * 
 * Central state orchestration layer. Composes modular domain hooks (auth, navigation,
 * devices, incidents, security events, integrity records, audit trail) into a unified
 * reactive context while maintaining strict backward-compatibility for `useApp()`.
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  INITIAL_AUDIT_LOGS,
  ML_METRICS_DATA,
  HOURLY_EVENT_TRENDS
} from '../services/mockData';
import { api } from '../api';
import { useAuth, DEMO_USERS } from '../hooks/useAuth';
import { useNavigation } from '../hooks/useNavigation';
import { useDevices } from '../hooks/useDevices';
import { useSecurityEvents } from '../hooks/useSecurityEvents';
import { useIncidents } from '../hooks/useIncidents';
import { useIntegrity } from '../hooks/useIntegrity';

export { DEMO_USERS };

const AppContext = createContext(null);

export function AppProvider({ children }) {
  // 1. Audit Trail State
  const [auditLogs, setAuditLogs] = useState(INITIAL_AUDIT_LOGS);
  const [backendOnline, setBackendOnline] = useState(false);
  const mlMetrics = ML_METRICS_DATA;
  const eventTrends = HOURLY_EVENT_TRENDS;

  const logAudit = useCallback((action, entityType, entityId, details) => {
    const newLog = {
      id: `AUDIT-${Math.floor(1000 + Math.random() * 9000)}`,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      actor: authState.currentUser?.email || 'analyst@medishield.local',
      role: authState.currentUser?.role || 'Security Analyst',
      action,
      entityType,
      entityId,
      ipAddress: "127.0.0.1",
      details
    };
    setAuditLogs(prev => [newLog, ...prev]);
  }, []);

  // 2. Domain Hooks
  const authState = useAuth();
  const navState = useNavigation();
  const deviceState = useDevices({ autoFetch: false, onAudit: logAudit });
  const eventState = useSecurityEvents({ autoFetch: false });
  const incidentState = useIncidents({ autoFetch: false, onAudit: logAudit });
  const integrityState = useIntegrity({ autoFetch: false, onAudit: logAudit });

  // 3. Centralized Backend Synchronization
  const syncWithBackend = useCallback(async () => {
    try {
      const summary = await api.getDashboardSummary();
      if (summary) {
        setBackendOnline(true);
      }
      await Promise.allSettled([
        deviceState.fetchDevices(),
        eventState.fetchEvents(),
        incidentState.fetchIncidents(),
        integrityState.fetchRecords()
      ]);
    } catch (e) {
      console.warn('[AppContext] Running in offline baseline mode:', e.message);
      setBackendOnline(false);
    }
  }, [deviceState, eventState, incidentState, integrityState]);

  useEffect(() => {
    syncWithBackend();
  }, []);

  // 4. Cross-domain Incident Creation
  const createIncidentFromEvent = useCallback((event) => {
    const localInc = {
      id: `INC-${Math.floor(1000 + Math.random() * 9000)}`,
      title: `${event.ruleName} Detected on ${event.deviceName || event.deviceId}`,
      description: `Automated incident ticket raised from Security Event ${event.id}. Evidence: ${JSON.stringify(event.evidence)}`,
      severity: event.severity || 'medium',
      status: "new",
      deviceId: event.deviceId,
      assignedTo: "Sarah Chen",
      createdAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
      notes: [
        {
          author: "Security Analyst",
          time: new Date().toLocaleTimeString(),
          text: `Ticket manually triggered by analyst from Security Event ${event.id}.`
        }
      ]
    };

    incidentState.setIncidents(prev => [localInc, ...prev]);
    logAudit('INCIDENT_CREATED', 'Incident', localInc.id, `Ticket created from security event ${event.id}.`);
    navState.setCurrentPage('incidents');
  }, [incidentState, logAudit, navState]);

  // 5. Unified Context Value (preserving all legacy contracts)
  const value = {
    // Auth
    currentUser: authState.currentUser,
    setCurrentUser: authState.setCurrentUser,
    login: authState.login,
    logout: authState.logout,
    switchUserRole: authState.switchUserRole,

    // Navigation
    currentPage: navState.currentPage,
    setCurrentPage: navState.setCurrentPage,
    openTabs: navState.openTabs,
    setOpenTabs: navState.setOpenTabs,
    closeTab: navState.closeTab,
    selectedDeviceId: navState.selectedDeviceId,
    setSelectedDeviceId: navState.setSelectedDeviceId,

    // Devices
    devices: deviceState.devices,
    setDevices: deviceState.setDevices,
    toggleDeviceIsolation: deviceState.toggleDeviceIsolation,
    registerDevice: deviceState.registerDevice,
    decommissionDevice: deviceState.decommissionDevice,

    // Security Events & Incidents
    securityEvents: eventState.securityEvents,
    setSecurityEvents: eventState.setSecurityEvents,
    incidents: incidentState.incidents,
    setIncidents: incidentState.setIncidents,
    updateIncidentStatus: incidentState.updateIncidentStatus,
    createIncidentFromEvent,

    // Cryptographic Integrity
    integrityRecords: integrityState.integrityRecords,
    setIntegrityRecords: integrityState.setIntegrityRecords,
    tamperRecord: integrityState.tamperRecord,
    recomputeAndVerify: integrityState.verifyRecord,

    // Auditing & Diagnostics
    auditLogs,
    setAuditLogs,
    logAudit,
    mlMetrics,
    eventTrends,
    backendOnline,
    syncWithBackend
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an <AppProvider>');
  }
  return context;
}

export default AppContext;
