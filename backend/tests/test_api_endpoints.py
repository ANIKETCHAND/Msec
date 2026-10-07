"""Automated End-to-End API and RBAC Tests."""

import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.database.init_db import seed_database

# Ensure database is seeded before running tests
seed_database()
client = TestClient(app)


def test_auth_login_success():
    """Verify Administrator login returns bearer token and role."""
    resp = client.post("/api/auth/login", json={
        "email": "admin@medishield.local",
        "password": "adminpassword123"
    })
    assert resp.status_code == 200
    data = resp.json()
    assert "access_token" in data
    assert data["role"] == "Administrator"
    assert data["email"] == "admin@medishield.local"


def test_auth_login_invalid_credentials():
    """Verify invalid password returns 401 Unauthorized."""
    resp = client.post("/api/auth/login", json={
        "email": "admin@medishield.local",
        "password": "wrong_password"
    })
    assert resp.status_code == 401
    assert "Invalid email or password" in resp.json()["detail"]


def test_rbac_unauthenticated_request_denied():
    """Verify accessing protected devices endpoint without token returns 401."""
    resp = client.get("/api/devices")
    assert resp.status_code == 401


def test_rbac_doctor_denied_admin_action():
    """Verify Doctor Demo role cannot execute Administrator-only device creation (403 Forbidden)."""
    # 1. Login as Doctor
    doc_login = client.post("/api/auth/login", json={
        "email": "doctor@medishield.local",
        "password": "doctorpassword123"
    })
    token = doc_login.json()["access_token"]

    # 2. Try creating a device
    headers = {"Authorization": f"Bearer {token}"}
    create_resp = client.post("/api/devices", json={
        "id": "DEV-TEST-999",
        "name": "Unauthorized Add Test",
        "device_type": "Pump",
        "ip_address": "192.168.10.99",
        "mac_address": "00:11:22:33:44:55",
        "firmware_version": "1.0",
        "network_segment": "ICU_VLAN_10"
    }, headers=headers)

    assert create_resp.status_code == 403
    assert "Access denied" in create_resp.json()["detail"]


def test_admin_can_list_and_create_device():
    """Verify Administrator can list and register devices."""
    admin_login = client.post("/api/auth/login", json={
        "email": "admin@medishield.local",
        "password": "adminpassword123"
    })
    token = admin_login.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # List devices
    list_resp = client.get("/api/devices", headers=headers)
    assert list_resp.status_code == 200
    devices = list_resp.json()
    assert len(devices) >= 6


def test_telemetry_ingestion_and_automated_detection():
    """Verify telemetry ingestion triggers rule engine and generates security event on threshold violation."""
    analyst_login = client.post("/api/auth/login", json={
        "email": "analyst@medishield.local",
        "password": "analystpassword123"
    })
    token = analyst_login.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Ingest telemetry with 8 failed auth attempts (violates RULE-AUTH-002)
    resp = client.post("/api/telemetry", json={
        "device_id": "DEV-VENT-502",
        "metrics": {"heart_rate": 78, "spo2": 99},
        "network_stats": {"failed_auth_count": 8, "packet_rate": 50, "source_ip": "192.168.10.198"},
        "is_anomaly": False
    }, headers=headers)

    assert resp.status_code == 201
    assert resp.json()["is_anomaly"] is True

    # Verify event was created
    events_resp = client.get("/api/security-events", headers=headers)
    assert events_resp.status_code == 200
    events = events_resp.json()
    assert any(e["rule_id"] == "RULE-AUTH-002" for e in events)


def test_cryptographic_integrity_verification_and_tamper_detection():
    """Verify SHA-256 verification detects payload tampering using an isolated test record."""
    from app.database.session import SessionLocal
    from app.models.db_models import IntegrityRecordModel
    from app.services.crypto_service import crypto_service

    # Setup isolated test record
    db = SessionLocal()
    rec_id = "REC-TEST-IDEMPOTENT-001"
    test_payload = "PATIENT_ID: TEST-01 | DEVICE: DEV-ECG-001 | BPM: 72"
    rec = db.query(IntegrityRecordModel).filter(IntegrityRecordModel.record_id == rec_id).first()
    if not rec:
        rec = IntegrityRecordModel(
            record_id=rec_id,
            entity_type="Test Record",
            raw_payload=test_payload,
            encrypted_payload=crypto_service.encrypt(test_payload),
            sha256_hash=crypto_service.compute_sha256(test_payload),
            status="VERIFIED"
        )
        db.add(rec)
    else:
        rec.raw_payload = test_payload
        rec.sha256_hash = crypto_service.compute_sha256(test_payload)
        rec.status = "VERIFIED"
    db.commit()
    db.close()

    analyst_login = client.post("/api/auth/login", json={
        "email": "analyst@medishield.local",
        "password": "analystpassword123"
    })
    token = analyst_login.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Initial verification should match
    v_resp = client.post("/api/integrity/verify", json={"record_id": rec_id}, headers=headers)
    assert v_resp.status_code == 200
    assert v_resp.json()["status"] == "VERIFIED"
    assert v_resp.json()["is_match"] is True

    # 2. Simulate 1-byte unauthorized mutation
    t_resp = client.post("/api/integrity/tamper-demo", json={"record_id": rec_id}, headers=headers)
    assert t_resp.status_code == 200
    assert t_resp.json()["status"] == "TAMPERED"

    # 3. Subsequent verification must fail
    v2_resp = client.post("/api/integrity/verify", json={"record_id": rec_id}, headers=headers)
    assert v2_resp.status_code == 200
    assert v2_resp.json()["status"] == "TAMPERED"
    assert v2_resp.json()["is_match"] is False


def test_reports_csv_export():
    """Verify CSV report streaming endpoint returns valid text/csv."""
    analyst_login = client.post("/api/auth/login", json={
        "email": "analyst@medishield.local",
        "password": "analystpassword123"
    })
    token = analyst_login.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    resp = client.get("/api/reports/security-events.csv", headers=headers)
    assert resp.status_code == 200
    assert "text/csv" in resp.headers["content-type"]
    assert "EventID,Timestamp" in resp.text


def test_ml_detection_status_and_evaluation():
    """Verify ML detection status and inference evaluation endpoint."""
    analyst_login = client.post("/api/auth/login", json={
        "email": "analyst@medishield.local",
        "password": "analystpassword123"
    })
    token = analyst_login.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Detection status
    status_resp = client.get("/api/detection/status", headers=headers)
    assert status_resp.status_code == 200
    data = status_resp.json()
    assert "ml_engine" in data
    assert "rule_engine" in data

    # 2. Normal flow evaluation
    norm_resp = client.post("/api/detection/evaluate", json={
        "device_id": "DEV-ECG-001",
        "packet_rate": 100.0,
        "packet_size": 520.0,
        "syn_ratio": 0.05,
        "port_entropy": 1.1,
        "failed_auth_count": 0
    }, headers=headers)
    assert norm_resp.status_code == 200
    assert norm_resp.json()["is_anomaly"] is False
    assert norm_resp.json()["predicted_class"] == "Benign"

    # 3. Malicious DoS flood evaluation
    dos_resp = client.post("/api/detection/evaluate", json={
        "device_id": "DEV-VENT-502",
        "packet_rate": 1400.0,
        "packet_size": 64.0,
        "syn_ratio": 0.85,
        "port_entropy": 1.2,
        "failed_auth_count": 0
    }, headers=headers)
    assert dos_resp.status_code == 200
    assert dos_resp.json()["is_anomaly"] is True
    assert dos_resp.json()["confidence"] > 0.8


def test_simulation_scenarios_and_reset():
    """Verify safe simulation controls generate alerts and can be reset."""
    admin_login = client.post("/api/auth/login", json={
        "email": "admin@medishield.local",
        "password": "adminpassword123"
    })
    token = admin_login.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Trigger traffic spike scenario
    sim_resp = client.post("/api/simulation/scenarios/traffic_spike", headers=headers)
    assert sim_resp.status_code == 200
    assert sim_resp.json()["status"] == "success"
    assert "EVT-SIM-NET-" in sim_resp.json()["event_generated"]

    # Reset simulation
    reset_resp = client.post("/api/simulation/reset", headers=headers)
    assert reset_resp.status_code == 200
    assert "reset successfully" in reset_resp.json()["message"]


def test_settings_policies_get_and_update():
    """Verify viewing and updating detection policies with RBAC validation."""
    admin_login = client.post("/api/auth/login", json={
        "email": "admin@medishield.local",
        "password": "adminpassword123"
    })
    token = admin_login.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Get policies
    get_resp = client.get("/api/settings/policies", headers=headers)
    assert get_resp.status_code == 200
    data = get_resp.json()
    assert "auth_failure_threshold" in data

    # 2. Update policies
    put_resp = client.put("/api/settings/policies", json={
        "auth_failure_threshold": 7.0,
        "packet_rate_dos_threshold": 750.0
    }, headers=headers)
    assert put_resp.status_code == 200
    assert put_resp.json()["auth_failure_threshold"] == 7.0
    assert put_resp.json()["packet_rate_dos_threshold"] == 750.0


def test_analyst_can_quarantine_device():
    """Verify Security Analyst can update device quarantine status."""
    analyst_login = client.post("/api/auth/login", json={
        "email": "analyst@medishield.local",
        "password": "analystpassword123"
    })
    token = analyst_login.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    patch_resp = client.patch("/api/devices/DEV-ECG-001", json={
        "status": "isolated",
        "risk_level": "critical"
    }, headers=headers)
    assert patch_resp.status_code == 200
    assert patch_resp.json()["status"] == "isolated"

    # Restore to online
    patch_resp2 = client.patch("/api/devices/DEV-ECG-001", json={
        "status": "online",
        "risk_level": "low"
    }, headers=headers)
    assert patch_resp2.status_code == 200
    assert patch_resp2.json()["status"] == "online"


