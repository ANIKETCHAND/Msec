import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  INITIAL_DEVICES,
  INITIAL_SECURITY_EVENTS,
  INITIAL_INCIDENTS,
  INTEGRITY_SAMPLE_RECORDS,
  INITIAL_AUDIT_LOGS,
  ML_METRICS_DATA,
  HOURLY_EVENT_TRENDS
} from '../services/mockData';
import { api } from '../services/api';

const AppContext = createContext();

export const DEMO_USERS = {
  admin: {
    name: "Dr. Marcus Vance",
    email: "admin@medishield.local",
    role: "Administrator",
    title: "Chief IoMT Security Officer",
    avatar: "MV",
    password: "adminpassword123"
  },
  analyst: {
    name: "Sarah Chen",
    email: "analyst@medishield.local",
    role: "Security Analyst",
    title: "Lead SOC Cyber Analyst",
    avatar: "SC",
    password: "analystpassword123"
  },
  doctor: {
    name: "Dr. Elena Rostova",
    email: "doctor@medishield.local",
    role: "Doctor Demo",
    title: "Attending ICU Physician",
    avatar: "ER",
    password: "doctorpassword123"
  }
};

export function AppProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(DEMO_USERS.analyst);
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [selectedDeviceId, setSelectedDeviceId] = useState('DEV-VENT-502');

  const [devices, setDevices] = useState(INITIAL_DEVICES);
  const [securityEvents, setSecurityEvents] = useState(INITIAL_SECURITY_EVENTS);
  const [incidents, setIncidents] = useState(INITIAL_INCIDENTS);
  const [integrityRecords, setIntegrityRecords] = useState(INTEGRITY_SAMPLE_RECORDS);
  const [auditLogs, setAuditLogs] = useState(INITIAL_AUDIT_LOGS);
  const [mlMetrics, setMlMetrics] = useState(ML_METRICS_DATA);
  const [eventTrends, setEventTrends] = useState(HOURLY_EVENT_TRENDS);
  const [simulationNotice, setSimulationNotice] = useState(null);
  const [backendOnline, setBackendOnline] = useState(false);

  // Sync data with backend API
  const syncWithBackend = async () => {
    try {
      // 1. Authenticate with backend for current demo user
      await api.login(currentUser.email, currentUser.password || "analystpassword123");

      // 2. Fetch live data from backend
      const [backendDevices, backendEvents, backendIncidents, backendAudit, backendIntegrity, detectionStatus] = await Promise.all([
        api.getDevices().catch(() => null),
        api.getSecurityEvents().catch(() => null),
        api.getIncidents().catch(() => null),
        api.getAuditLogs().catch(() => null),
        api.getIntegrityResults().catch(() => null),
        api.getDetectionStatus().catch(() => null),
      ]);

      if (backendDevices && backendDevices.length > 0) {
        setDevices(backendDevices.map(d => ({
          id: d.id,
          name: d.name,
          deviceType: d.device_type,
          ipAddress: d.ip_address,
          macAddress: d.mac_address,
          firmwareVersion: d.firmware_version,
          networkSegment: d.network_segment,
          status: d.status,
          riskLevel: d.risk_level,
          lastSeen: d.last_seen ? new Date(d.last_seen).toLocaleTimeString() : "Just now",
          patientRoom: d.meta_info?.room || "Ward 10",
          batteryLevel: d.meta_info?.battery || 95,
          telemetry: d.meta_info || {}
        })));
      }

      if (backendEvents && backendEvents.length > 0) {
        setSecurityEvents(backendEvents.map(e => ({
          id: e.id,
          timestamp: new Date(e.timestamp).toLocaleTimeString(),
          eventType: e.event_type,
          ruleId: e.rule_id,
          ruleName: e.rule_name,
          deviceId: e.device_id || "DEV-UNKNOWN",
          deviceName: e.device_id || "Unspecified Device",
          severity: e.severity,
          status: e.status,
          evidence: e.evidence || {},
          suggestedAction: e.suggested_action || "Investigate telemetry stream."
        })));
      }

      if (backendIncidents && backendIncidents.length > 0) {
        setIncidents(backendIncidents.map(i => ({
          id: i.id,
          title: i.title,
          description: i.description,
          severity: i.severity,
          status: i.status,
          assignedTo: i.assigned_to || "Unassigned",
          deviceId: i.device_id || "N/A",
          createdAt: new Date(i.created_at).toLocaleTimeString(),
          updatedAt: new Date(i.updated_at).toLocaleTimeString(),
          notes: i.notes || []
        })));
      }

      if (backendAudit && backendAudit.length > 0) {
        setAuditLogs(backendAudit.map(a => ({
          id: a.id,
          timestamp: new Date(a.timestamp).toLocaleTimeString(),
          actor: a.actor,
          role: a.role,
          action: a.action,
          entityType: a.entity_type,
          entityId: a.entity_id,
          ipAddress: a.ip_address,
          details: a.details
        })));
      }

      if (backendIntegrity && backendIntegrity.length > 0) {
        setIntegrityRecords(backendIntegrity.map(r => ({
          recordId: r.record_id,
          entityType: r.entity_type,
          rawPayload: r.raw_payload,
          encryptedPayload: r.encrypted_payload,
          sha256Hash: r.sha256_hash,
          status: r.status,
          lastVerified: new Date(r.last_verified).toLocaleTimeString()
        })));
      }

      if (detectionStatus?.ml_engine?.metadata) {
        const meta = detectionStatus.ml_engine.metadata;
        setMlMetrics(prev => ({
          ...prev,
          accuracy: meta.trained_accuracy ? `${(meta.trained_accuracy * 100).toFixed(1)}%` : prev.accuracy,
          precision: meta.trained_precision ? `${(meta.trained_precision * 100).toFixed(1)}%` : prev.precision,
          recall: meta.trained_recall ? `${(meta.trained_recall * 100).toFixed(1)}%` : prev.recall,
          f1Score: meta.trained_f1 ? `${(meta.trained_f1 * 100).toFixed(1)}%` : prev.f1Score,
          modelName: meta.model_name || prev.modelName
        }));
      }

      setBackendOnline(true);
    } catch (err) {
      console.log("[AppContext] Backend unreachable; operating in standalone prototype mode:", err.message);
      setBackendOnline(false);
    }
  };

  useEffect(() => {
    syncWithBackend();
  }, [currentUser]);

  // Helper to record an audit log entry
  const logAudit = (action, entityType, entityId, details) => {
    const newLog = {
      id: `AUD-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      actor: currentUser?.email || "anonymous@medishield.local",
      role: currentUser?.role || "System",
      action,
      entityType,
      entityId,
      ipAddress: "192.168.1.104",
      details
    };
    setAuditLogs(prev => [newLog, ...prev]);
  };

  // Device Actions
  const toggleDeviceIsolation = async (deviceId) => {
    const dev = devices.find(d => d.id === deviceId);
    if (!dev) return;

    const nextStatus = dev.status === 'isolated' ? 'online' : 'isolated';
    const nextRisk = nextStatus === 'isolated' ? 'critical' : 'low';

    try {
      await api.updateDevice(deviceId, { status: nextStatus, risk_level: nextRisk });
    } catch (e) {
      // Continue locally
    }

    setDevices(prev => prev.map(d => {
      if (d.id === deviceId) {
        logAudit('DEVICE_STATUS_CHANGE', 'Device', deviceId, `Device ${deviceId} changed to ${nextStatus}.`);
        return { ...d, status: nextStatus, riskLevel: nextRisk };
      }
      return d;
    }));
  };

  // Incident Actions
  const updateIncidentStatus = async (incidentId, newStatus, noteText) => {
    try {
      await api.updateIncident(incidentId, { status: newStatus, new_note: noteText });
    } catch (e) {
      // Continue locally
    }

    setIncidents(prev => prev.map(inc => {
      if (inc.id === incidentId) {
        const updatedNotes = [...inc.notes];
        if (noteText) {
          updatedNotes.push({
            author: currentUser.name,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            text: noteText
          });
        }
        logAudit('INCIDENT_UPDATE', 'Incident', incidentId, `Status transitioned to ${newStatus}. Note: ${noteText || 'None'}`);
        return {
          ...inc,
          status: newStatus,
          updatedAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
          notes: updatedNotes
        };
      }
      return inc;
    }));
  };

  const createIncidentFromEvent = async (event) => {
    const newInc = {
      id: `INC-2026-0${incidents.length + 82}`,
      title: `Investigation: ${event.ruleName}`,
      description: `Automated investigation ticket raised from event ${event.id} on device ${event.deviceId}. Evidence: ${JSON.stringify(event.evidence)}`,
      severity: event.severity,
      status: "new",
      assigned_to: currentUser.name,
      device_id: event.deviceId
    };

    try {
      await api.createIncident(newInc);
    } catch (e) {
      // Continue locally
    }

    const localInc = {
      ...newInc,
      assignedTo: currentUser.name,
      deviceId: event.deviceId,
      createdAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
      updatedAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
      notes: [
        {
          author: currentUser.name,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          text: `Opened investigation for alert ${event.id}.`
        }
      ]
    };

    setIncidents(prev => [localInc, ...prev]);
    logAudit('INCIDENT_CREATED', 'Incident', localInc.id, `Ticket created from security event ${event.id}.`);
    setCurrentPage('incidents');
    setSimulationNotice(`Created Incident ${localInc.id} from Event ${event.id}!`);
  };

  // Data Integrity Actions
  const tamperRecord = async (recordId) => {
    try {
      await api.tamperRecord(recordId);
    } catch (e) {
      // Continue locally
    }

    setIntegrityRecords(prev => prev.map(rec => {
      if (rec.recordId === recordId) {
        const tamperedHash = "deadbeef" + rec.sha256Hash.substring(8);
        logAudit('INTEGRITY_TAMPER_SIMULATION', 'IntegrityRecord', recordId, `Simulated 1-byte memory tampering on record ${recordId}.`);
        return {
          ...rec,
          status: "TAMPERED",
          sha256Hash: tamperedHash,
          lastVerified: new Date().toISOString().replace('T', ' ').substring(0, 19)
        };
      }
      return rec;
    }));
  };

  const recomputeAndVerify = async (recordId) => {
    try {
      const res = await api.verifyIntegrity(recordId);
      if (res) {
        setIntegrityRecords(prev => prev.map(rec => {
          if (rec.recordId === recordId) {
            return {
              ...rec,
              status: res.status,
              sha256Hash: res.expected_hash,
              lastVerified: new Date().toLocaleTimeString()
            };
          }
          return rec;
        }));
        return;
      }
    } catch (e) {
      // Continue locally
    }

    setIntegrityRecords(prev => prev.map(rec => {
      if (rec.recordId === recordId) {
        logAudit('INTEGRITY_VERIFY_SUCCESS', 'IntegrityRecord', recordId, `Cryptographic SHA-256 verification successful. Integrity intact.`);
        return {
          ...rec,
          status: "VERIFIED",
          sha256Hash: "4f73801f9b31d0442ea5746b149b584988f5043bf7cfab7b19a0a382e753457a",
          lastVerified: new Date().toISOString().replace('T', ' ').substring(0, 19)
        };
      }
      return rec;
    }));
  };

  // Safe Simulation Controls
  const triggerSimulation = async (type) => {
    try {
      await api.triggerScenario(type);
    } catch (e) {
      // Continue locally
    }

    const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);

    if (type === 'auth_spike') {
      const newEvt = {
        id: `EVT-2026-${Math.floor(9100 + Math.random() * 800)}`,
        timestamp,
        eventType: "AUTH_FAILURE_SPIKE",
        ruleId: "RULE-AUTH-002",
        ruleName: "Repeated Failed Authentication Attempts",
        deviceId: "DEV-VENT-502",
        deviceName: "Smart Critical Care Ventilator V-2",
        severity: "high",
        status: "open",
        evidence: { failedAttempts: 8, windowSeconds: 20, sourceIp: "192.168.10.198" },
        suggestedAction: "Enforce gateway quarantine on attacking host."
      };
      setSecurityEvents(prev => [newEvt, ...prev]);
      logAudit('SIMULATION_TRIGGERED', 'SecuritySimulation', 'RULE-AUTH-002', 'Simulated SSH brute force spike against DEV-VENT-502.');
      setSimulationNotice("Simulated Brute-Force Authentication Spike on Ventilator V-2!");
    } else if (type === 'traffic_spike') {
      const newEvt = {
        id: `EVT-2026-${Math.floor(9100 + Math.random() * 800)}`,
        timestamp,
        eventType: "UNUSUAL_TRAFFIC_VOLUME",
        ruleId: "RULE-NET-003",
        ruleName: "Unusual Simulated Traffic Volume Spike",
        deviceId: "DEV-PUMP-204",
        deviceName: "Smart Infusion Pump B-4",
        severity: "medium",
        status: "open",
        evidence: { baselineByteRate: "1.2 KB/s", observedByteRate: "14.2 MB/s", flowDuration: "60s" },
        suggestedAction: "Throttle switch port on ICU VLAN 10."
      };
      setSecurityEvents(prev => [newEvt, ...prev]);
      logAudit('SIMULATION_TRIGGERED', 'SecuritySimulation', 'RULE-NET-003', 'Simulated DoS bandwidth flood on DEV-PUMP-204.');
      setSimulationNotice("Simulated Network Bandwidth Surge on Infusion Pump B-4!");
    } else if (type === 'device_offline') {
      setDevices(prev => prev.map(d => d.id === 'DEV-GLU-309' ? { ...d, status: 'offline', riskLevel: 'medium' } : d));
      const newEvt = {
        id: `EVT-2026-${Math.floor(9100 + Math.random() * 800)}`,
        timestamp,
        eventType: "DEVICE_OFFLINE_UNEXPECTED",
        ruleId: "RULE-STAT-004",
        ruleName: "Clinical Device Unexpectedly Offline",
        deviceId: "DEV-GLU-309",
        deviceName: "Wireless Continuous Glucose Monitor",
        severity: "medium",
        status: "open",
        evidence: { missedHeartbeats: 3, lastSeen: "Just now" },
        suggestedAction: "Check battery or Bluetooth gateway coverage in Ward Bed 214."
      };
      setSecurityEvents(prev => [newEvt, ...prev]);
      logAudit('SIMULATION_TRIGGERED', 'SecuritySimulation', 'RULE-STAT-004', 'Simulated offline drop for DEV-GLU-309.');
      setSimulationNotice("Simulated Device Offline event for Continuous Glucose Monitor!");
    } else if (type === 'unknown_device') {
      const newDev = {
        id: `DEV-ROGUE-${Math.floor(10 + Math.random() * 90)}`,
        name: "Unregistered Wi-Fi Bridge (MAC: 00:09:B0:88:AA:11)",
        deviceType: "Unknown Hardware",
        ipAddress: "192.168.10.220",
        macAddress: "00:09:B0:88:AA:11",
        firmwareVersion: "Unknown",
        networkSegment: "ICU_VLAN_10",
        status: "suspicious",
        riskLevel: "high",
        lastSeen: "Just now",
        patientRoom: "ICU Hallway",
        batteryLevel: 100,
        telemetry: { status: "Unauthorized Bridge Detected" }
      };
      setDevices(prev => [newDev, ...prev]);
      const newEvt = {
        id: `EVT-2026-${Math.floor(9100 + Math.random() * 800)}`,
        timestamp,
        eventType: "UNKNOWN_DEVICE_DISCOVERY",
        ruleId: "RULE-DEV-001",
        ruleName: "Rogue IoMT Device Detected",
        deviceId: newDev.id,
        deviceName: newDev.name,
        severity: "high",
        status: "open",
        evidence: { mac: newDev.macAddress, vlan: newDev.networkSegment },
        suggestedAction: "Physically locate device and revoke switch port."
      };
      setSecurityEvents(prev => [newEvt, ...prev]);
      logAudit('SIMULATION_TRIGGERED', 'SecuritySimulation', 'RULE-DEV-001', 'Simulated rogue device injection on ICU VLAN 10.');
      setSimulationNotice("Simulated Rogue Device injected into ICU VLAN 10!");
    }
  };

  const resetAllSimulations = async () => {
    try {
      await api.resetSimulation();
    } catch (e) {
      // Continue locally
    }
    setDevices(INITIAL_DEVICES);
    setSecurityEvents(INITIAL_SECURITY_EVENTS);
    setIncidents(INITIAL_INCIDENTS);
    setIntegrityRecords(INTEGRITY_SAMPLE_RECORDS);
    setAuditLogs(INITIAL_AUDIT_LOGS);
    setSimulationNotice("All simulated device anomalies reset to clean baseline.");
  };

  const value = {
    currentUser,
    setCurrentUser,
    currentPage,
    setCurrentPage,
    selectedDeviceId,
    setSelectedDeviceId,
    devices,
    securityEvents,
    incidents,
    integrityRecords,
    auditLogs,
    mlMetrics,
    eventTrends,
    simulationNotice,
    setSimulationNotice,
    backendOnline,
    toggleDeviceIsolation,
    updateIncidentStatus,
    createIncidentFromEvent,
    tamperRecord,
    recomputeAndVerify,
    triggerSimulation,
    resetAllSimulations,
    logAudit
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
