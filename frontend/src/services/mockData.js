/**
 * MediShield High-Fidelity Synthetic Dataset & Simulation Store.
 * Isolated demo data for Phase 2 frontend and safe academic demonstrations.
 * All records, vitals, and device streams are 100% synthetic.
 */

export const INITIAL_DEVICES = [
  {
    id: "DEV-ECG-101",
    name: "Bedside Multi-Lead ECG Monitor A",
    deviceType: "ECG Monitor",
    ipAddress: "192.168.10.15",
    macAddress: "00:1A:7D:DA:71:11",
    firmwareVersion: "v3.1.2",
    networkSegment: "ICU_VLAN_10",
    status: "online",
    riskLevel: "low",
    lastSeen: "Just now",
    patientRoom: "ICU Room 104",
    batteryLevel: 98,
    telemetry: {
      heartRate: 74,
      spo2: 99,
      systolicBp: 120,
      diastolicBp: 78,
      status: "Stable"
    }
  },
  {
    id: "DEV-PUMP-204",
    name: "Smart Infusion Pump B-4",
    deviceType: "Infusion Pump",
    ipAddress: "192.168.10.22",
    macAddress: "00:1A:7D:DA:71:88",
    firmwareVersion: "v1.8.0",
    networkSegment: "ICU_VLAN_10",
    status: "online",
    riskLevel: "medium",
    lastSeen: "2 mins ago",
    patientRoom: "ICU Room 104",
    batteryLevel: 85,
    telemetry: {
      infusionRate: 15.0,
      volumeDelivered: 250,
      dosageUnit: "mL/hr",
      status: "Infusing"
    }
  },
  {
    id: "DEV-VENT-502",
    name: "Smart Critical Care Ventilator V-2",
    deviceType: "Ventilator",
    ipAddress: "192.168.10.35",
    macAddress: "00:1A:7D:DA:72:04",
    firmwareVersion: "v2.4.1",
    networkSegment: "ICU_VLAN_10",
    status: "suspicious",
    riskLevel: "high",
    lastSeen: "Just now",
    patientRoom: "ICU Room 108",
    batteryLevel: 100,
    telemetry: {
      respiratoryRate: 16,
      tidalVolume: 450,
      peep: 5.0,
      status: "Elevated Network Inbound"
    }
  },
  {
    id: "DEV-GLU-309",
    name: "Wireless Continuous Glucose Monitor",
    deviceType: "Glucose Monitor",
    ipAddress: "192.168.20.45",
    macAddress: "00:1A:7D:DA:82:33",
    firmwareVersion: "v2.0.4",
    networkSegment: "WARD_VLAN_20",
    status: "online",
    riskLevel: "low",
    lastSeen: "1 min ago",
    patientRoom: "Ward Bed 214",
    batteryLevel: 64,
    telemetry: {
      bloodGlucose: 112,
      trend: "Flat",
      unit: "mg/dL",
      status: "Normal"
    }
  },
  {
    id: "DEV-BED-401",
    name: "Ward Bedside Patient Monitor W-1",
    deviceType: "Bedside Monitor",
    ipAddress: "192.168.20.12",
    macAddress: "00:1A:7D:DA:82:90",
    firmwareVersion: "v4.0.1",
    networkSegment: "WARD_VLAN_20",
    status: "online",
    riskLevel: "low",
    lastSeen: "Just now",
    patientRoom: "Ward Bed 215",
    batteryLevel: 92,
    telemetry: {
      heartRate: 82,
      spo2: 97,
      temperature: 36.8,
      status: "Stable"
    }
  },
  {
    id: "DEV-DEFIB-603",
    name: "Automated External Defibrillator AED-3",
    deviceType: "Defibrillator",
    ipAddress: "192.168.30.18",
    macAddress: "00:1A:7D:DA:93:44",
    firmwareVersion: "v1.2.0",
    networkSegment: "ER_VLAN_30",
    status: "offline",
    riskLevel: "critical",
    lastSeen: "34 mins ago",
    patientRoom: "ER Trauma Bay 2",
    batteryLevel: 42,
    telemetry: {
      selfTestStatus: "Missed Checkin",
      padsExpiry: "2027-04-15",
      status: "Disconnected"
    }
  },
  {
    id: "DEV-GATE-001",
    name: "IoMT Hospital Edge Gateway GW-ICU",
    deviceType: "Gateway",
    ipAddress: "192.168.10.1",
    macAddress: "00:1B:44:99:FF:01",
    firmwareVersion: "v5.2.0",
    networkSegment: "CORE_VLAN_1",
    status: "online",
    riskLevel: "low",
    lastSeen: "Just now",
    patientRoom: "Server Closet A",
    batteryLevel: 100,
    telemetry: {
      activeTunnels: 14,
      throughputMbps: 48.2,
      cpuLoad: 24,
      status: "Routing"
    }
  },
  {
    id: "DEV-PULSE-712",
    name: "Wireless Pulse Oximeter SPO2-12",
    deviceType: "Wearable Sensor",
    ipAddress: "192.168.40.88",
    macAddress: "00:1A:7D:DA:A4:77",
    firmwareVersion: "v1.1.5",
    networkSegment: "AMBULATORY_VLAN_40",
    status: "online",
    riskLevel: "low",
    lastSeen: "3 mins ago",
    patientRoom: "Ambulatory Ward",
    batteryLevel: 78,
    telemetry: {
      heartRate: 68,
      spo2: 98,
      status: "Normal"
    }
  }
];

export const INITIAL_SECURITY_EVENTS = [
  {
    id: "EVT-2026-9041",
    timestamp: "2026-10-01 11:58:22",
    eventType: "AUTH_FAILURE_SPIKE",
    ruleId: "RULE-AUTH-002",
    ruleName: "Repeated Failed Authentication Attempts",
    deviceId: "DEV-VENT-502",
    deviceName: "Smart Critical Care Ventilator V-2",
    severity: "high",
    status: "investigating",
    evidence: {
      failedAttempts: 7,
      windowSeconds: 30,
      sourceIp: "192.168.10.198 (Unknown Host)",
      protocol: "SSH / Port 22"
    },
    suggestedAction: "Isolate ventilator network segment and audit port 22 access logs."
  },
  {
    id: "EVT-2026-9040",
    timestamp: "2026-10-01 11:52:14",
    eventType: "UNUSUAL_TRAFFIC_VOLUME",
    ruleId: "RULE-NET-003",
    ruleName: "Unusual Simulated Traffic Volume Spike",
    deviceId: "DEV-PUMP-204",
    deviceName: "Smart Infusion Pump B-4",
    severity: "medium",
    status: "open",
    evidence: {
      baselineByteRate: "1.2 KB/s",
      observedByteRate: "8.4 MB/s",
      flowDuration: "45s",
      destinationIp: "192.168.10.254"
    },
    suggestedAction: "Verify pump telemetry firmware version and rate-limit segment."
  },
  {
    id: "EVT-2026-9038",
    timestamp: "2026-10-01 11:24:00",
    eventType: "DEVICE_OFFLINE_UNEXPECTED",
    ruleId: "RULE-STAT-004",
    ruleName: "Life-Critical Device Heartbeat Loss",
    deviceId: "DEV-DEFIB-603",
    deviceName: "Automated External Defibrillator AED-3",
    severity: "critical",
    status: "open",
    evidence: {
      lastHeartbeat: "2026-10-01 11:24:00",
      missedPings: 4,
      segment: "ER_VLAN_30"
    },
    suggestedAction: "Physical inspection of ER Trauma Bay 2 defibrillator hardware and AP signal."
  },
  {
    id: "EVT-2026-9035",
    timestamp: "2026-10-01 10:45:11",
    eventType: "INTEGRITY_MISMATCH",
    ruleId: "RULE-HASH-007",
    ruleName: "Cryptographic Data Digest Mismatch",
    deviceId: "DEV-ECG-101",
    deviceName: "Bedside Multi-Lead ECG Monitor A",
    severity: "high",
    status: "resolved",
    evidence: {
      storedSha256: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
      computedSha256: "8f434346648f6b96df89dda901c5176b10a6d83961dd3c1ac88b59b2dc327aa4",
      recordId: "REC-SYNTH-84920"
    },
    suggestedAction: "Investigate local database record manipulation or unauthorized write."
  },
  {
    id: "EVT-2026-9031",
    timestamp: "2026-10-01 09:15:40",
    eventType: "UNKNOWN_DEVICE_DISCOVERY",
    ruleId: "RULE-DEV-001",
    ruleName: "Unregistered Device Joined Clinical Segment",
    deviceId: "UNKNOWN-ROUTER",
    deviceName: "Unregistered Transceiver (MAC: 00:E0:4C:68:01:FE)",
    severity: "medium",
    status: "closed",
    evidence: {
      macAddress: "00:E0:4C:68:01:FE",
      vlan: "WARD_VLAN_20",
      assignedIp: "192.168.20.199"
    },
    suggestedAction: "Block port on switch SW-WARD-02; authenticate equipment custodian."
  }
];

export const INITIAL_INCIDENTS = [
  {
    id: "INC-2026-081",
    title: "Brute Force Authentication on Ventilator V-2",
    description: "Multiple failed authentication attempts detected targeting ICU Ventilator SSH service from an unauthenticated IP.",
    severity: "high",
    status: "investigating",
    assignedTo: "Sarah Chen (Security Analyst)",
    deviceId: "DEV-VENT-502",
    createdAt: "2026-10-01 11:59:00",
    updatedAt: "2026-10-01 12:05:00",
    notes: [
      { author: "System Rule", time: "11:59", text: "Auto-promoted from EVT-2026-9041 threshold violation." },
      { author: "Sarah Chen", time: "12:05", text: "Quarantined IP 192.168.10.198 via gateway firewall rule. Monitoring ventilator vitals." }
    ]
  },
  {
    id: "INC-2026-079",
    title: "Unexpected Disconnect of Emergency Defibrillator AED-3",
    description: "Critical emergency equipment ceased heartbeat responses for over 30 minutes in ER Trauma Bay 2.",
    severity: "critical",
    status: "new",
    assignedTo: "Unassigned",
    deviceId: "DEV-DEFIB-603",
    createdAt: "2026-10-01 11:28:00",
    updatedAt: "2026-10-01 11:28:00",
    notes: [
      { author: "System Rule", time: "11:28", text: "Generated after 4 missed heartbeat intervals." }
    ]
  },
  {
    id: "INC-2026-064",
    title: "Infusion Pump Data Integrity Mismatch",
    description: "Synthetic dosage calibration record failed SHA-256 hash validation during scheduled integrity sweep.",
    severity: "medium",
    status: "resolved",
    assignedTo: "Dr. Marcus Vance (Admin)",
    deviceId: "DEV-PUMP-204",
    createdAt: "2026-09-30 16:20:00",
    updatedAt: "2026-09-30 17:45:00",
    notes: [
      { author: "Dr. Marcus Vance", time: "17:45", text: "Calibration table re-synced with master backup. Integrity verification confirmed passing." }
    ]
  }
];

export const ML_METRICS_DATA = {
  modelName: "RandomForestClassifier",
  dataset: "CICIoMT2024 (Canadian Institute for Cybersecurity)",
  provenance: "UNB IoMT Lab Traffic (46 Extracted Flow Features)",
  version: "v1.4.0",
  lastEvaluated: "2026-10-01 10:30 UTC",
  accuracy: 96.84,
  precision: 96.21,
  recall: 95.89,
  f1Score: 96.05,
  classDistribution: [
    { label: "Normal Clinical Traffic", count: 45200, percentage: "64.5%" },
    { label: "DoS / DDoS Flood", count: 12400, percentage: "17.7%" },
    { label: "Network Recon / Scan", count: 7800, percentage: "11.1%" },
    { label: "Auth Brute-Force", count: 4600, percentage: "6.7%" }
  ],
  confusionMatrix: [
    { actual: "Normal", predNormal: 44100, predDoS: 450, predRecon: 520, predAuth: 130 },
    { actual: "DoS Flood", predNormal: 210, predDoS: 12050, predRecon: 90, predAuth: 50 },
    { actual: "Recon Scan", predNormal: 180, predDoS: 110, predRecon: 7420, predAuth: 90 },
    { actual: "Auth Attack", predNormal: 80, predDoS: 40, predRecon: 70, predAuth: 4410 }
  ],
  featureImportance: [
    { feature: "Flow Packet Rate (pkts/sec)", importance: 0.28 },
    { feature: "Avg Packet Size (bytes)", importance: 0.22 },
    { feature: "SYN Flag Ratio", importance: 0.18 },
    { feature: "Destination Port Entropy", importance: 0.14 },
    { feature: "Flow Inter-Arrival Time (IAT)", importance: 0.11 },
    { feature: "Failed Handshake Ratio", importance: 0.07 }
  ]
};

export const INTEGRITY_SAMPLE_RECORDS = [
  {
    recordId: "REC-SYNTH-84920",
    recordType: "Patient Telemetry Batch",
    deviceId: "DEV-ECG-101",
    payloadJson: JSON.stringify({ patientId: "P-4019", hr: 74, spo2: 99, systolicBp: 120, status: "Normal" }),
    sha256Hash: "4f73801f9b31d0442ea5746b149b584988f5043bf7cfab7b19a0a382e753457a",
    encryptionAlgorithm: "AES-256-GCM (12-byte Nonce, 16-byte Tag)",
    encryptedDataHex: "4a7f01c92b8d9a44017e89ab32cfa8710928eac488b43290f1d5e38194",
    status: "VERIFIED",
    lastVerified: "2026-10-01 11:55:00"
  },
  {
    recordId: "REC-SYNTH-84921",
    recordType: "Infusion Dosage Log",
    deviceId: "DEV-PUMP-204",
    payloadJson: JSON.stringify({ patientId: "P-4019", medication: "Normal Saline 0.9%", rateMlHr: 15.0, deliveredMl: 250 }),
    sha256Hash: "8b23f0449ac841967a18bb409e5309d784a92c4819aa3058f92160d738f71290",
    encryptionAlgorithm: "AES-256-GCM (12-byte Nonce, 16-byte Tag)",
    encryptedDataHex: "9e81bfa0092c4819ad5817a3901bce4710398efc78a014902187fa9301",
    status: "VERIFIED",
    lastVerified: "2026-10-01 11:56:10"
  },
  {
    recordId: "REC-SYNTH-84922",
    recordType: "Ventilator Flow Parameters",
    deviceId: "DEV-VENT-502",
    payloadJson: JSON.stringify({ patientId: "P-3108", mode: "SIMV", fio2: 40, peep: 5.0, tv: 450 }),
    sha256Hash: "1e48f0293da81974630a9bfd71904a298cb47109823ae09184fc901923ba8104",
    encryptionAlgorithm: "AES-256-GCM (12-byte Nonce, 16-byte Tag)",
    encryptedDataHex: "3981acfd401948ba29048a17cb0194e8239014abdf0941829034af1093",
    status: "VERIFIED",
    lastVerified: "2026-10-01 11:58:00"
  }
];

export const INITIAL_AUDIT_LOGS = [
  {
    id: "AUD-2026-1049",
    timestamp: "2026-10-01 12:00:15",
    actor: "analyst@medishield.local",
    role: "Security Analyst",
    action: "INCIDENT_UPDATE",
    entityType: "Incident",
    entityId: "INC-2026-081",
    ipAddress: "192.168.1.104",
    details: "Added investigation note and marked ventilator IP quarantine status."
  },
  {
    id: "AUD-2026-1048",
    timestamp: "2026-10-01 11:58:22",
    actor: "system_rule_engine",
    role: "System Service",
    action: "SECURITY_EVENT_DETECTED",
    entityType: "SecurityEvent",
    entityId: "EVT-2026-9041",
    ipAddress: "127.0.0.1",
    details: "Rule RULE-AUTH-002 triggered for DEV-VENT-502."
  },
  {
    id: "AUD-2026-1047",
    timestamp: "2026-10-01 11:55:00",
    actor: "admin@medishield.local",
    role: "Administrator",
    action: "INTEGRITY_VERIFICATION_RUN",
    entityType: "IntegrityAudit",
    entityId: "BATCH-2026-09",
    ipAddress: "192.168.1.50",
    details: "Triggered SHA-256 integrity check across 3 synthetic telemetry records. Result: ALL VERIFIED."
  },
  {
    id: "AUD-2026-1046",
    timestamp: "2026-10-01 11:20:00",
    actor: "analyst@medishield.local",
    role: "Security Analyst",
    action: "REPORT_EXPORT",
    entityType: "CSVReport",
    entityId: "REP-SEC-EVT-01",
    ipAddress: "192.168.1.104",
    details: "Exported 24-hour security events audit report in CSV format."
  },
  {
    id: "AUD-2026-1045",
    timestamp: "2026-10-01 09:30:12",
    actor: "admin@medishield.local",
    role: "Administrator",
    action: "USER_AUTHENTICATION",
    entityType: "AuthSession",
    entityId: "SES-99418",
    ipAddress: "192.168.1.50",
    details: "Successful login via administrator credentials."
  }
];

export const HOURLY_EVENT_TRENDS = [
  { time: "06:00", Normal: 450, Recon: 12, DoS: 0, BruteForce: 2 },
  { time: "07:00", Normal: 620, Recon: 18, DoS: 5, BruteForce: 1 },
  { time: "08:00", Normal: 890, Recon: 24, DoS: 8, BruteForce: 4 },
  { time: "09:00", Normal: 1100, Recon: 45, DoS: 12, BruteForce: 6 },
  { time: "10:00", Normal: 1250, Recon: 38, DoS: 20, BruteForce: 15 },
  { time: "11:00", Normal: 1380, Recon: 52, DoS: 35, BruteForce: 28 },
  { time: "12:00", Normal: 1420, Recon: 40, DoS: 18, BruteForce: 22 }
];
