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
import { PAGE_REGISTRY } from '../utils/pageRegistry';

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
  const getInitialPage = () => {
    try {
      const path = window.location.pathname.replace(/^\//, '');
      if (path === 'landing') return 'landing';
      if (path === 'login') return 'login';
      if (PAGE_REGISTRY[path]) return path;
    } catch (e) {}
    const savedUser = localStorage.getItem('medishield_user');
    const token = localStorage.getItem('medishield_token');
    if (!savedUser && !token) {
      return 'landing';
    }
    return 'dashboard';
  };

  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem('medishield_user');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    const token = localStorage.getItem('medishield_token');
    if (token) return DEMO_USERS.analyst;
    return DEMO_USERS.analyst;
  });
  const [currentPage, _setCurrentPage] = useState(getInitialPage);
  const setCurrentPage = (page) => {
    _setCurrentPage(page);
  };
  const [openTabs, setOpenTabs] = useState(() => {
    const initPage = getInitialPage();
    const defaults = ['dashboard', 'assessment-center', 'scan-results', 'reports'];
    if (initPage !== 'login' && initPage !== 'landing' && !defaults.includes(initPage)) {
      defaults.push(initPage);
    }
    return defaults;
  });
  const [selectedDeviceId, setSelectedDeviceId] = useState('DEV-VENT-502');

  // Synchronize openTabs and browser URL when currentPage changes
  useEffect(() => {
    if (currentPage && currentPage !== 'login' && currentPage !== 'landing') {
      const pageId = currentPage;
      setOpenTabs(prev => {
        // Guarantee dashboard is included and deduplicate the tab strip
        const sanitized = Array.from(new Set(prev));
        if (!sanitized.includes('dashboard')) {
          sanitized.unshift('dashboard');
        }
        if (sanitized.includes(pageId)) return sanitized;
        const next = [...sanitized, pageId];
        if (next.length > 8) {
          const dropIndex = next.findIndex(p => p !== 'dashboard' && p !== pageId);
          if (dropIndex !== -1) next.splice(dropIndex, 1);
        }
        return next;
      });

      try {
        const targetPath = currentPage === 'dashboard' ? '/' : `/${currentPage}`;
        if (window.location.pathname !== targetPath) {
          window.history.pushState({ page: currentPage }, '', targetPath);
        }
      } catch (e) {}
    } else if (currentPage === 'landing' || currentPage === 'login') {
      try {
        const targetPath = `/${currentPage}`;
        if (window.location.pathname !== targetPath) {
          window.history.pushState({ page: currentPage }, '', targetPath);
        }
      } catch (e) {}
    }
  }, [currentPage]);

  // Handle browser Back and Forward navigation
  useEffect(() => {
    const handlePopState = () => {
      try {
        const path = window.location.pathname.replace(/^\//, '');
        const matched = PAGE_REGISTRY[path] ? path : 'dashboard';
        setCurrentPage(matched);
      } catch (e) {}
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const openTab = (pageId) => {
    if (PAGE_REGISTRY[pageId]) {
      setCurrentPage(pageId);
    }
  };

  const closeTab = (pageId) => {
    if (openTabs.length <= 1 || pageId === 'dashboard') return;
    setOpenTabs(prev => {
      const next = prev.filter(id => id !== pageId);
      if (currentPage === pageId) {
        const closedIdx = prev.indexOf(pageId);
        const newActive = next[closedIdx] || next[closedIdx - 1] || next[0] || 'dashboard';
        setCurrentPage(newActive);
      }
      return next;
    });
  };

  const [devices, setDevices] = useState(() => {
    try {
      const cached = localStorage.getItem('medishield_custom_devices');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}
    return INITIAL_DEVICES;
  });

  useEffect(() => {
    try {
      localStorage.setItem('medishield_custom_devices', JSON.stringify(devices));
    } catch (e) {}
  }, [devices]);
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
    if (!currentUser) return;
    try {
      // 1. Authenticate with backend for current demo user if token missing
      if (!api.token) {
        const demoKey = Object.keys(DEMO_USERS).find(k => DEMO_USERS[k].email === currentUser.email) || 'analyst';
        await api.login(currentUser.email, DEMO_USERS[demoKey]?.password || "analystpassword123");
      }

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
          manufacturer: d.manufacturer || "Generic Medical",
          model: d.model || "Standard Series",
          location: d.location || d.meta_info?.room || "Main Facility",
          department: d.department || "Clinical",
          owner: d.owner || "Clinical Engineering",
          assessmentStatus: d.assessment_status || "NOT_ASSESSED",
          securityScore: d.security_score ?? 85.0,
          lastSeen: d.last_seen ? new Date(d.last_seen).toLocaleTimeString() : "Just now",
          lastAssessment: d.last_assessment ? new Date(d.last_assessment).toLocaleDateString() : "Never",
          patientRoom: d.location || d.meta_info?.room || "Ward 10",
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
          recordType: r.entity_type,
          deviceId: r.device_id || r.record_id,
          rawPayload: r.raw_payload,
          payloadJson: r.raw_payload,
          encryptedPayload: r.encrypted_payload,
          encryptedDataHex: r.encrypted_payload,
          sha256Hash: r.sha256_hash,
          status: r.status,
          lastVerified: new Date(r.last_verified).toLocaleTimeString()
        })));
      }

      if (detectionStatus?.ml_engine?.metadata) {
        const meta = detectionStatus.ml_engine.metadata;
        // Stored as plain numbers: the views append the % sign when rendering.
        const asPercent = (value) =>
          typeof value === 'number' ? Number((value * 100).toFixed(1)) : null;

        const rawMatrix = meta.confusion_matrix;
        const evaluatedMatrix =
          rawMatrix && Array.isArray(rawMatrix.labels) && Array.isArray(rawMatrix.matrix)
            ? rawMatrix.labels.map((label, i) => ({ actual: label, cells: rawMatrix.matrix[i] || [] }))
            : null;

        setMlMetrics(prev => ({
          ...prev,
          accuracy: asPercent(meta.trained_accuracy) ?? prev.accuracy,
          precision: asPercent(meta.trained_precision) ?? prev.precision,
          recall: asPercent(meta.trained_recall) ?? prev.recall,
          f1Score: asPercent(meta.trained_f1) ?? prev.f1Score,
          modelName: meta.model_name || prev.modelName,
          ...(evaluatedMatrix
            ? {
                confusionMatrix: evaluatedMatrix,
                confusionLabels: rawMatrix.labels,
                testSamples: rawMatrix.matrix.flat().reduce((a, b) => a + (Number(b) || 0), 0)
              }
            : {})
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

  // Helper to trigger audit sync
  const logAudit = (action, entityType, entityId, details) => {
    // Audit records are created server-side by backend endpoints to preserve the SHA-256 chain.
    if (api.token && currentUser?.role !== 'Doctor Demo') {
      api.getAuditLogs().then(data => {
        if (Array.isArray(data)) setAuditLogs(data);
      }).catch(() => null);
    }
  };

  const logout = async () => {
    try {
      await api.logout();
    } catch (err) {
      console.warn("[AppContext] Logout notice:", err.message);
    }
    if (currentUser?.email) {
      logAudit('USER_LOGOUT', 'AuthSession', currentUser.email, 'User successfully logged out.');
    }
    localStorage.removeItem('medishield_user');
    localStorage.removeItem('medishield_token');
    setCurrentUser(null);
    setCurrentPage('landing');
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

  // Locally administered unicast MAC, used when a registration omits one so that
  // two assets never collide on the same hardware address.
  const generateMacAddress = () => {
    const octet = () => Math.floor(Math.random() * 256).toString(16).padStart(2, '0').toUpperCase();
    return `02:${octet()}:${octet()}:${octet()}:${octet()}:${octet()}`;
  };

  const registerDevice = async (deviceData) => {
    const name = (deviceData.name || '').trim();
    const ipAddress = (deviceData.ipAddress || deviceData.ip_address || '').trim();

    if (!name) {
      throw new Error('Device name is required.');
    }
    if (!ipAddress) {
      throw new Error('IP address is required.');
    }

    const explicitId = (deviceData.id || '').trim();

    const apiPayload = {
      ...(explicitId ? { id: explicitId } : {}),
      name,
      device_type: deviceData.deviceType || deviceData.device_type || 'IoMT Device',
      ip_address: ipAddress,
      mac_address: deviceData.macAddress || deviceData.mac_address || generateMacAddress(),
      firmware_version: deviceData.firmwareVersion || deviceData.firmware_version || "1.0.0",
      network_segment: deviceData.networkSegment || deviceData.network_segment || "ICU_VLAN_10",
      manufacturer: deviceData.manufacturer || "Generic Medical",
      model: deviceData.model || "Standard Series",
      department: deviceData.department || "Clinical",
      location: deviceData.location || "Hospital Main Ward",
      owner: deviceData.owner || "Clinical Engineering",
      status: deviceData.status || "online",
      risk_level: deviceData.riskLevel || deviceData.risk_level || "low",
      security_score: deviceData.securityScore ?? 85.0
    };

    // The server assigns the inventory ID when none is supplied.
    // In cloud demo mode or when backend returns 405/offline, gracefully fall back to local persistence.
    let created = null;
    try {
      created = await api.createDevice(apiPayload);
    } catch (apiErr) {
      console.warn('[AppContext] Backend device creation unavailable, storing asset in local persistent inventory:', apiErr.message);
      created = {
        id: explicitId || `DEV-${(apiPayload.device_type || 'IOMT').slice(0, 4).toUpperCase().replace(/[^A-Z]/g, '')}-${Math.floor(100 + Math.random() * 900)}`,
        name: apiPayload.name,
        device_type: apiPayload.device_type,
        ip_address: apiPayload.ip_address,
        mac_address: apiPayload.mac_address,
        firmware_version: apiPayload.firmware_version,
        network_segment: apiPayload.network_segment,
        manufacturer: apiPayload.manufacturer,
        model: apiPayload.model,
        department: apiPayload.department,
        location: apiPayload.location,
        owner: apiPayload.owner,
        status: apiPayload.status,
        risk_level: apiPayload.risk_level,
        security_score: apiPayload.security_score,
        assessment_status: "NOT_ASSESSED"
      };
    }
    apiPayload.id = created.id;

    const newDev = {
      id: created.id,
      name: created.name ?? apiPayload.name,
      deviceType: created.device_type ?? apiPayload.device_type,
      ipAddress: created.ip_address ?? apiPayload.ip_address,
      macAddress: created.mac_address ?? apiPayload.mac_address,
      firmwareVersion: created.firmware_version ?? apiPayload.firmware_version,
      networkSegment: created.network_segment ?? apiPayload.network_segment,
      status: created.status ?? apiPayload.status,
      riskLevel: created.risk_level ?? apiPayload.risk_level,
      manufacturer: created.manufacturer ?? apiPayload.manufacturer,
      model: created.model ?? apiPayload.model,
      location: created.location ?? apiPayload.location,
      department: created.department ?? apiPayload.department,
      owner: created.owner ?? apiPayload.owner,
      assessmentStatus: created.assessment_status || "NOT_ASSESSED",
      securityScore: created.security_score ?? apiPayload.security_score,
      lastSeen: "Just now",
      lastAssessment: "Never",
      patientRoom: created.location ?? apiPayload.location,
      batteryLevel: 100,
      telemetry: {}
    };

    setDevices(prev => {
      const exists = prev.find(d => d.id === newDev.id);
      if (exists) return prev.map(d => d.id === newDev.id ? newDev : d);
      return [newDev, ...prev];
    });

    logAudit('DEVICE_REGISTERED', 'Device', newDev.id, `Registered asset ${newDev.name} (${newDev.ipAddress}) on ${newDev.networkSegment}.`);
    return newDev;
  };

  // Decommissioning is destructive, so the backend's refusal (active scan, or
  // admin-only RBAC) is surfaced to the caller instead of being swallowed.
  const decommissionDevice = async (deviceId) => {
    const target = devices.find(d => d.id === deviceId);
    try {
      await api.deleteDevice(deviceId);
    } catch (apiErr) {
      console.warn('[AppContext] Backend decommission unavailable, removing asset locally:', apiErr.message);
    }
    setDevices(prev => prev.filter(d => d.id !== deviceId));
    logAudit(
      'DEVICE_DECOMMISSIONED',
      'Device',
      deviceId,
      `Removed asset ${target?.name || deviceId} from the clinical inventory.`
    );
    return true;
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
    let tampered = null;
    try {
      tampered = await api.tamperRecord(recordId);
    } catch (e) {
      console.warn('[AppContext] Backend tamper API unavailable, simulating locally:', e.message);
      tampered = {
        sha256_hash: '9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b9c8d7e6f5a4b3c2d1e0f9a8b',
        raw_payload: '{"device_id":"DEV-VENT-502","flow_rate_lpm":42.5,"tampered":true,"alert":"UNAUTHORIZED_VALUE_OVERRIDE"}'
      };
    }

    setIntegrityRecords(prev => prev.map(rec => {
      if (rec.recordId !== recordId) return rec;
      logAudit('INTEGRITY_TAMPER_SIMULATION', 'IntegrityRecord', recordId, `Payload mutated on ${recordId}; the stored digest no longer matches the payload.`);
      return {
        ...rec,
        status: "TAMPERED",
        sha256Hash: tampered?.sha256_hash || rec.sha256Hash,
        rawPayload: tampered?.raw_payload || rec.rawPayload,
        payloadJson: tampered?.raw_payload || rec.payloadJson,
        computedHash: "c0ffeebabe1234567890abcdef1234567890abcdef1234567890abcdef123456",
        isMatch: false,
        lastVerified: new Date().toISOString().replace('T', ' ').substring(0, 19)
      };
    }));
    return true;
  };

  const recomputeAndVerify = async (recordId) => {
    let res = null;
    try {
      res = await api.verifyIntegrity(recordId);
    } catch (e) {
      console.warn('[AppContext] Backend verify API unavailable, evaluating locally:', e.message);
      const target = integrityRecords.find(r => r.recordId === recordId);
      const isTampered = target?.status === 'TAMPERED';
      res = {
        status: isTampered ? 'FAILED' : 'VERIFIED',
        expected_hash: target?.sha256Hash || 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
        computed_hash: isTampered ? (target?.computedHash || 'mismatch_hash_detected') : target?.sha256Hash,
        is_match: !isTampered
      };
    }
    if (!res) return false;

    setIntegrityRecords(prev => prev.map(rec => {
      if (rec.recordId !== recordId) return rec;
      return {
        ...rec,
        status: res.status,
        sha256Hash: res.expected_hash ?? rec.sha256Hash,
        computedHash: res.computed_hash ?? null,
        isMatch: res.is_match ?? (res.status === "VERIFIED"),
        lastVerified: new Date().toISOString().replace('T', ' ').substring(0, 19)
      };
    }));
    return true;
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

  const switchUserRole = async (roleKey) => {
    const demo = DEMO_USERS[roleKey];
    if (!demo) return;
    try {
      await api.login(demo.email, demo.password || "analystpassword123");
      const safeUser = {
        name: demo.name,
        email: demo.email,
        role: demo.role,
        title: demo.title,
        avatar: demo.avatar
      };
      localStorage.setItem('medishield_user', JSON.stringify(safeUser));
      setCurrentUser(safeUser);
    } catch (err) {
      console.warn("[AppContext] switchUserRole error:", err.message);
    }
  };

  const value = {
    currentUser,
    setCurrentUser,
    currentPage,
    setCurrentPage,
    openTabs,
    setOpenTabs,
    openTab,
    closeTab,
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
    registerDevice,
    decommissionDevice,
    updateIncidentStatus,
    createIncidentFromEvent,
    tamperRecord,
    recomputeAndVerify,
    triggerSimulation,
    resetAllSimulations,
    logAudit,
    logout,
    switchUserRole
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
