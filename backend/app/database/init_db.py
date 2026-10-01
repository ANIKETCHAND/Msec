"""Database Initialization and Synthetic Demo Data Seeding."""

import uuid
from datetime import datetime, timezone
from app.database.session import engine, SessionLocal, Base
from app.models.db_models import (
    UserModel,
    DeviceModel,
    TelemetryModel,
    SecurityEventModel,
    IncidentModel,
    AuditLogModel,
    IntegrityRecordModel,
    ModelMetadataModel
)
from app.services.auth_service import auth_service
from app.services.crypto_service import crypto_service


def seed_database():
    """Initializes tables and seeds initial synthetic demo records if not present."""
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    try:
        # 1. Seed Demo Users
        if db.query(UserModel).count() == 0:
            users = [
                UserModel(
                    id="usr-admin-01",
                    email="admin@medishield.local",
                    full_name="Dr. Marcus Vance",
                    role="Administrator",
                    password_hash=auth_service.hash_password("adminpassword123"),
                    is_active=True
                ),
                UserModel(
                    id="usr-analyst-02",
                    email="analyst@medishield.local",
                    full_name="Sarah Chen",
                    role="Security Analyst",
                    password_hash=auth_service.hash_password("analystpassword123"),
                    is_active=True
                ),
                UserModel(
                    id="usr-doctor-03",
                    email="doctor@medishield.local",
                    full_name="Dr. Elena Rostova",
                    role="Doctor Demo",
                    password_hash=auth_service.hash_password("doctorpassword123"),
                    is_active=True
                )
            ]
            db.add_all(users)
            db.commit()

        # 2. Seed Simulated Devices
        if db.query(DeviceModel).count() == 0:
            devices = [
                DeviceModel(
                    id="DEV-ECG-001",
                    name="Bedside 12-Lead ECG Monitor",
                    device_type="ECG Monitor",
                    ip_address="192.168.10.45",
                    mac_address="00:1A:2B:3C:4D:5E",
                    firmware_version="2.4.1-patch3",
                    network_segment="ICU_VLAN_10",
                    status="online",
                    risk_level="low",
                    meta_info={"room": "ICU Bed 04", "battery": 98, "assigned_doctor": "Dr. Elena Rostova"}
                ),
                DeviceModel(
                    id="DEV-VENT-502",
                    name="Smart Critical Care Ventilator V-2",
                    device_type="Ventilator",
                    ip_address="192.168.10.52",
                    mac_address="00:1A:2B:44:55:66",
                    firmware_version="3.1.0-build88",
                    network_segment="ICU_VLAN_10",
                    status="suspicious",
                    risk_level="high",
                    meta_info={"room": "ICU Bed 08", "battery": 100, "assigned_doctor": "Dr. Elena Rostova"}
                ),
                DeviceModel(
                    id="DEV-PUMP-204",
                    name="Smart Infusion Pump B-4",
                    device_type="Infusion Pump",
                    ip_address="192.168.10.88",
                    mac_address="00:1A:2B:77:88:99",
                    firmware_version="1.8.2-sec",
                    network_segment="ICU_VLAN_10",
                    status="online",
                    risk_level="medium",
                    meta_info={"room": "ICU Bed 02", "battery": 85, "flow_rate_ml_hr": 25.0}
                ),
                DeviceModel(
                    id="DEV-GLU-309",
                    name="Wireless Continuous Glucose Monitor",
                    device_type="Glucose Monitor",
                    ip_address="192.168.20.12",
                    mac_address="A4:C3:F0:11:22:33",
                    firmware_version="4.0.1",
                    network_segment="WARD_VLAN_20",
                    status="online",
                    risk_level="low",
                    meta_info={"room": "Ward 214", "battery": 62, "glucose_mg_dl": 110}
                ),
                DeviceModel(
                    id="DEV-WEAR-101",
                    name="Multi-Parameter Ambulatory Patch",
                    device_type="Wearable Health Patch",
                    ip_address="192.168.40.75",
                    mac_address="B8:27:EB:AA:BB:CC",
                    firmware_version="1.2.0-ble",
                    network_segment="AMBULATORY_VLAN_40",
                    status="online",
                    risk_level="low",
                    meta_info={"room": "Outpatient Wing", "battery": 74}
                ),
                DeviceModel(
                    id="DEV-DEF-601",
                    name="Emergency Defibrillator Crash Cart Unit",
                    device_type="Defibrillator",
                    ip_address="192.168.30.15",
                    mac_address="C0:FF:EE:12:34:56",
                    firmware_version="5.1.2",
                    network_segment="ER_VLAN_30",
                    status="offline",
                    risk_level="medium",
                    meta_info={"room": "ER Bay 3", "battery": 45}
                )
            ]
            db.add_all(devices)
            db.commit()

        # 3. Seed Security Events
        if db.query(SecurityEventModel).count() == 0:
            events = [
                SecurityEventModel(
                    id="EVT-2026-001",
                    device_id="DEV-VENT-502",
                    event_type="AUTH_FAILURE_SPIKE",
                    severity="high",
                    rule_id="RULE-AUTH-002",
                    rule_name="Repeated Failed Authentication Attempts",
                    evidence={"failed_count": 8, "window_seconds": 20, "source_ip": "192.168.10.198"},
                    suggested_action="Enforce gateway quarantine on attacking host.",
                    status="open"
                ),
                SecurityEventModel(
                    id="EVT-2026-002",
                    device_id="DEV-PUMP-204",
                    event_type="UNUSUAL_TRAFFIC_VOLUME",
                    severity="medium",
                    rule_id="RULE-NET-003",
                    rule_name="Unusual Simulated Traffic Volume Spike (Potential DoS)",
                    evidence={"observed_rate_pps": 840, "syn_ratio": 0.45, "threshold": 600},
                    suggested_action="Throttle switch port on ICU VLAN 10.",
                    status="investigating"
                ),
                SecurityEventModel(
                    id="EVT-2026-003",
                    device_id="DEV-DEF-601",
                    event_type="DEVICE_OFFLINE_UNEXPECTED",
                    severity="medium",
                    rule_id="RULE-STAT-004",
                    rule_name="Clinical Device Unexpectedly Offline",
                    evidence={"missed_heartbeats": 5, "last_contact": "25 mins ago"},
                    suggested_action="Check emergency crash cart Wi-Fi repeater in ER Bay 3.",
                    status="open"
                )
            ]
            db.add_all(events)
            db.commit()

        # 4. Seed Incidents
        if db.query(IncidentModel).count() == 0:
            incidents = [
                IncidentModel(
                    id="INC-2026-001",
                    title="Investigation: Brute-Force Authentication on Ventilator DEV-VENT-502",
                    description="Multiple unauthorized SSH login attempts originating from untrusted internal host 192.168.10.198.",
                    severity="high",
                    status="investigating",
                    assigned_to="Sarah Chen",
                    device_id="DEV-VENT-502",
                    notes=[
                        {"author": "Sarah Chen", "time": "10:15 UTC", "text": "Confirmed 8 failed attempts in 20-second window. VLAN isolation considered."},
                        {"author": "Dr. Marcus Vance", "time": "10:30 UTC", "text": "Approved temporary host block. ICU clinical monitoring remains uninterrupted."}
                    ]
                ),
                IncidentModel(
                    id="INC-2026-002",
                    title="Investigation: Bandwidth Anomaly on Infusion Pump B-4",
                    description="Suspicious packet flood targeting infusion pump IP. Potential volumetric DoS probing.",
                    severity="medium",
                    status="new",
                    assigned_to="Sarah Chen",
                    device_id="DEV-PUMP-204",
                    notes=[
                        {"author": "System", "time": "11:00 UTC", "text": "Automated incident created from EVT-2026-002."}
                    ]
                )
            ]
            db.add_all(incidents)
            db.commit()

        # 5. Seed Cryptographic Integrity Records
        if db.query(IntegrityRecordModel).count() == 0:
            sample_payload1 = "PATIENT_ID: SYN-9921 | DEVICE: DEV-ECG-001 | BPM: 72 | SPO2: 98 | ECG_ST_ELEVATION: 0.02mV"
            sample_payload2 = "PATIENT_ID: SYN-8834 | DEVICE: DEV-VENT-502 | TV_ML: 480 | PEEP_CMH2O: 5.0 | RR: 14"

            rec1 = IntegrityRecordModel(
                record_id="REC-ICU-001",
                entity_type="Synthetic Bedside ECG Log",
                raw_payload=sample_payload1,
                encrypted_payload=crypto_service.encrypt(sample_payload1),
                sha256_hash=crypto_service.compute_sha256(sample_payload1),
                status="VERIFIED"
            )
            rec2 = IntegrityRecordModel(
                record_id="REC-ICU-002",
                entity_type="Synthetic Ventilator Telemetry",
                raw_payload=sample_payload2,
                encrypted_payload=crypto_service.encrypt(sample_payload2),
                sha256_hash=crypto_service.compute_sha256(sample_payload2),
                status="VERIFIED"
            )
            db.add_all([rec1, rec2])
            db.commit()

        # 6. Seed Audit Logs
        if db.query(AuditLogModel).count() == 0:
            logs = [
                AuditLogModel(
                    id="AUD-2026-001",
                    actor="admin@medishield.local",
                    role="Administrator",
                    action="SYSTEM_INITIALIZED",
                    entity_type="System",
                    entity_id="MediShield-Core",
                    details="MediShield prototype database seeded with synthetic records.",
                    status="success"
                ),
                AuditLogModel(
                    id="AUD-2026-002",
                    actor="analyst@medishield.local",
                    role="Security Analyst",
                    action="INCIDENT_ASSIGNED",
                    entity_type="Incident",
                    entity_id="INC-2026-001",
                    details="Assigned Sarah Chen as lead investigator.",
                    status="success"
                )
            ]
            db.add_all(logs)
            db.commit()

    finally:
        db.close()


if __name__ == "__main__":
    seed_database()
    print("MediShield database initialized and seeded successfully.")
