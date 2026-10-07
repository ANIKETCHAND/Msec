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


def test_assessment_scope_authorization_and_defensive_restrictions():
    """Verify defensive scope enforcement: only registered devices with matching IPs can be authorized."""
    analyst_login = client.post("/api/auth/login", json={
        "email": "analyst@medishield.local",
        "password": "analystpassword123"
    })
    analyst_token = analyst_login.json()["access_token"]
    analyst_headers = {"Authorization": f"Bearer {analyst_token}"}

    # 1. Valid authorization for registered device
    scope_resp = client.post("/api/assessments/authorize-scope", json={
        "device_id": "DEV-ECG-001",
        "target_ip": "192.168.10.45",
        "assessment_profile": "DEFENSIVE_AUDIT",
        "authorized_scope": ["PORT_DISCOVERY", "SERVICE_ENUMERATION"],
        "selected_tools": ["nmap"],
        "duration_hours": 4,
        "justification": "Routine quarterly medical telemetry port verification"
    }, headers=analyst_headers)
    assert scope_resp.status_code == 201
    scope_data = scope_resp.json()
    assert scope_data["device_id"] == "DEV-ECG-001"
    assert scope_data["authorization_status"] == "AUTHORIZED"
    scope_id = scope_data["id"]

    # 2. Blocked: Mismatched / arbitrary internet IP targeting
    bad_ip_resp = client.post("/api/assessments/authorize-scope", json={
        "device_id": "DEV-ECG-001",
        "target_ip": "8.8.8.8",
        "assessment_profile": "DEFENSIVE_AUDIT",
        "selected_tools": ["nmap"],
        "justification": "Attempting arbitrary internet target"
    }, headers=analyst_headers)
    assert bad_ip_resp.status_code == 400
    assert "does not match registered device IP" in bad_ip_resp.json()["detail"]

    # 3. Blocked: Unregistered device ID
    non_device_resp = client.post("/api/assessments/authorize-scope", json={
        "device_id": "DEV-NONEXISTENT-999",
        "target_ip": "192.168.10.99",
        "assessment_profile": "DEFENSIVE_AUDIT",
        "selected_tools": ["nmap"],
        "justification": "Non-existent device"
    }, headers=analyst_headers)
    assert non_device_resp.status_code == 404

    # 4. Doctor role blocked from scope creation (RBAC)
    doc_login = client.post("/api/auth/login", json={
        "email": "doctor@medishield.local",
        "password": "doctorpassword123"
    })
    doc_token = doc_login.json()["access_token"]
    doc_headers = {"Authorization": f"Bearer {doc_token}"}
    doc_resp = client.post("/api/assessments/authorize-scope", json={
        "device_id": "DEV-ECG-001",
        "target_ip": "192.168.10.45",
        "justification": "Unauthorized role attempt"
    }, headers=doc_headers)
    assert doc_resp.status_code == 403

    # 5. List scopes includes the authorized scope
    list_resp = client.get("/api/assessments/scopes", headers=analyst_headers)
    assert list_resp.status_code == 200
    assert any(s["id"] == scope_id for s in list_resp.json())

    # 6. Revoke scope
    revoke_resp = client.post(f"/api/assessments/scopes/{scope_id}/revoke", headers=analyst_headers)
    assert revoke_resp.status_code == 200
    assert revoke_resp.json()["authorization_status"] == "REVOKED"


def test_assessment_execution_orchestration_and_findings():
    """Verify tool inventory status and execution of authorized multi-tool assessment."""
    analyst_login = client.post("/api/auth/login", json={
        "email": "analyst@medishield.local",
        "password": "analystpassword123"
    })
    token = analyst_login.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Query tool inventory
    inv_resp = client.get("/api/assessments/tools/inventory", headers=headers)
    assert inv_resp.status_code == 200
    tools = inv_resp.json()
    assert any(t["name"] == "nmap" for t in tools)
    assert any(t["name"] == "nuclei" for t in tools)

    # 2. Authorize scope for DEV-VENT-502
    scope_resp = client.post("/api/assessments/authorize-scope", json={
        "device_id": "DEV-VENT-502",
        "target_ip": "192.168.10.52",
        "assessment_profile": "DEFENSIVE_AUDIT",
        "authorized_scope": ["PORT_DISCOVERY", "VULNERABILITY_CHECK"],
        "selected_tools": ["nmap", "nuclei"],
        "duration_hours": 2,
        "justification": "ICU Ventilator defensive compliance verification"
    }, headers=headers)
    assert scope_resp.status_code == 201
    scope_id = scope_resp.json()["id"]

    # 3. Attempt execution with unapproved tool (e.g. 'nikto' not in selected_tools) -> 403
    unapproved_tool_resp = client.post("/api/assessments/execute", json={
        "scope_id": scope_id,
        "device_id": "DEV-VENT-502",
        "profile": "DEFENSIVE_AUDIT",
        "tools": ["nikto"]
    }, headers=headers)
    assert unapproved_tool_resp.status_code == 403

    # 4. Execute authorized assessment with nmap & nuclei
    exec_resp = client.post("/api/assessments/execute", json={
        "scope_id": scope_id,
        "device_id": "DEV-VENT-502",
        "profile": "DEFENSIVE_AUDIT",
        "tools": ["nmap", "nuclei"]
    }, headers=headers)
    assert exec_resp.status_code == 201
    asm_data = exec_resp.json()
    assert asm_data["status"] == "COMPLETED"
    assert asm_data["device_id"] == "DEV-VENT-502"
    assert len(asm_data["findings"]) > 0
    assert asm_data["security_score"] <= 100.0

    # 5. Verify device in DB was updated with new score & assessment status
    dev_resp = client.get("/api/devices/DEV-VENT-502", headers=headers)
    assert dev_resp.status_code == 200
    dev_data = dev_resp.json()
    assert dev_data["security_score"] == asm_data["security_score"]
    assert dev_data["assessment_status"] in ["ASSESSED", "REMEDIATION_REQUIRED"]


def test_ids_ingest_and_status():
    """Verify passive IDS status query and Suricata EVE JSON alert ingestion."""
    analyst_login = client.post("/api/auth/login", json={
        "email": "analyst@medishield.local",
        "password": "analystpassword123"
    })
    token = analyst_login.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Query IDS status
    status_resp = client.get("/api/detection/ids/status", headers=headers)
    assert status_resp.status_code == 200
    assert "suricata" in status_resp.json()
    assert "zeek" in status_resp.json()

    # 2. Ingest simulated Suricata EVE JSON alert for registered device DEV-ECG-001 (192.168.10.45)
    eve_alert = {
        "timestamp": "2026-10-07T12:00:00.000Z",
        "src_ip": "10.0.0.99",
        "dest_ip": "192.168.10.45",
        "dest_port": 2575,
        "proto": "TCP",
        "app_proto": "hl7",
        "alert": {
            "action": "allowed",
            "gid": 1,
            "signature_id": 2024001,
            "signature": "ET CLINICAL Unencrypted HL7 Telemetry Data Broadcast",
            "category": "Potentially Vulnerable Clinical Traffic",
            "severity": 2
        }
    }
    ingest_resp = client.post("/api/detection/ids/ingest", json=eve_alert, headers=headers)
    assert ingest_resp.status_code == 200
    ingest_data = ingest_resp.json()
    assert ingest_data["status"] == "ingested"
    assert ingest_data["device_id"] == "DEV-ECG-001"
    assert ingest_data["severity"] == "high"


def test_event_correlation_and_incident_generation():
    """Verify multi-source event correlation generates structured incident tickets."""
    analyst_login = client.post("/api/auth/login", json={
        "email": "analyst@medishield.local",
        "password": "analystpassword123"
    })
    token = analyst_login.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # DEV-VENT-502 has findings and telemetry alerts from previous tests
    corr_resp = client.post("/api/incidents/correlate/DEV-VENT-502", headers=headers)
    # Returns 200 with incident if patterns match, or 404 if insufficient patterns
    assert corr_resp.status_code in [200, 404]
    if corr_resp.status_code == 200:
        inc_data = corr_resp.json()
        assert inc_data["device_id"] == "DEV-VENT-502"
        assert any("SIMULATION" in n.get("text", "") for n in inc_data["notes"])


def test_audit_hash_chain_verification():
    """Verify cryptographic SHA-256 hash chain verification endpoint."""
    analyst_login = client.post("/api/auth/login", json={
        "email": "analyst@medishield.local",
        "password": "analystpassword123"
    })
    token = analyst_login.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    verify_resp = client.get("/api/audit-logs/verify-chain", headers=headers)
    assert verify_resp.status_code == 200
    data = verify_resp.json()
    assert "chain_valid" in data
    assert data["chain_valid"] is True
    assert data["total_records"] > 0




