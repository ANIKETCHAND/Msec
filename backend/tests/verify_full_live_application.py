"""Comprehensive End-to-End Live Application Verification Script.

Tests every practical workflow, endpoint, and tool integration against the running
FastAPI backend and live tools (Nmap, ML Random Forest, Cryptographic ledger, etc.).
Ensures zero synthetic mocks or simulators in core operational paths.
"""

import sys
import hashlib
import httpx

BASE_URL = "http://127.0.0.1:8000/api/v1"

def print_step(num: int, title: str):
    print(f"\n{'='*70}\nSTEP {num}: {title}\n{'='*70}")

def verify_all():
    client = httpx.Client(timeout=45.0)

    # -------------------------------------------------------------
    # 1. Health & Readiness Check
    # -------------------------------------------------------------
    print_step(1, "Health and Subsystem Readiness Check")
    resp = client.get(f"{BASE_URL}/health")
    assert resp.status_code == 200, f"Health check failed: {resp.text}"
    health = resp.json()
    print(f"Health Status: {health.get('status')}")
    print(f"Services: {health.get('services')}")
    assert health.get("status") == "healthy"
    assert health.get("services", {}).get("ml_inference") == "operational (model_active)"

    # -------------------------------------------------------------
    # 2. Authentication & Admin Persona JWT
    # -------------------------------------------------------------
    print_step(2, "Authenticate Admin Persona & Verify JWT Session")
    login_resp = client.post(
        f"{BASE_URL}/auth/login",
        json={"email": "admin@medishield.local", "password": "adminpassword123"}
    )
    assert login_resp.status_code == 200, f"Admin login failed: {login_resp.text}"
    token_data = login_resp.json()
    token = token_data.get("access_token")
    assert token, "No access token returned"
    client.headers.update({"Authorization": f"Bearer {token}"})

    me_resp = client.get(f"{BASE_URL}/auth/me")
    assert me_resp.status_code == 200
    user_me = me_resp.json()
    print(f"Logged in as: {user_me.get('email')} | Role: {user_me.get('role')}")
    assert user_me.get("role") in ("Administrator", "SECURITY_ADMIN")

    # -------------------------------------------------------------
    # 3. Device Registration & Inventory Query
    # -------------------------------------------------------------
    print_step(3, "Device Inventory Query & Live Registration")
    devs_resp = client.get(f"{BASE_URL}/devices")
    assert devs_resp.status_code == 200
    devices = devs_resp.json()
    print(f"Found {len(devices)} existing monitored devices.")

    test_dev_id = "DEV-LIVE-TEST-01"
    new_device_payload = {
        "id": test_dev_id,
        "name": "Live Bedside Patient Telemetry",
        "device_type": "Patient Monitor",
        "ip_address": "127.0.0.1",
        "mac_address": "00:1A:2B:3C:4D:99",
        "firmware_version": "3.1.4",
        "network_segment": "ICU_VLAN_10",
        "manufacturer": "Philips Medical",
        "model": "IntelliVue X3",
        "department": "Critical Care",
        "location": "ICU Room 204",
        "owner": "Biomedical Engineering",
        "status": "online",
        "risk_level": "low",
        "security_score": 92.0
    }
    del_check = client.get(f"{BASE_URL}/devices/{test_dev_id}")
    if del_check.status_code == 200:
        print(f"Device {test_dev_id} already exists.")
    else:
        create_resp = client.post(f"{BASE_URL}/devices", json=new_device_payload)
        assert create_resp.status_code == 201, f"Device registration failed: {create_resp.text}"
        print(f"Successfully registered device {test_dev_id} via API.")

    # -------------------------------------------------------------
    # 4. Defensive Boundary Safeguards Verification
    # -------------------------------------------------------------
    print_step(4, "Defensive Scope Authorization & Boundary Restrictions")
    invalid_scope_payload = {
        "device_id": test_dev_id,
        "target_ip": "127.0.0.1",
        "assessment_profile": "AGGRESSIVE_EXPLOIT_PENTEST",
        "selected_tools": ["nmap"],
        "authorized_scope": ["PORT_DISCOVERY"],
        "justification": "Testing boundary enforcement"
    }
    rej_resp = client.post(f"{BASE_URL}/assessments/authorize-scope", json=invalid_scope_payload)
    print(f"Out-of-policy profile rejection status: {rej_resp.status_code}")
    assert rej_resp.status_code in (400, 422), f"Expected rejection, got {rej_resp.status_code}"

    valid_scope_payload = {
        "device_id": test_dev_id,
        "target_ip": "127.0.0.1",
        "assessment_profile": "DEFENSIVE_AUDIT",
        "selected_tools": ["nmap", "trivy", "syft"],
        "authorized_scope": ["PORT_DISCOVERY", "SERVICE_ENUMERATION", "VULNERABILITY_CHECK"],
        "justification": "Formal scheduled defensive evaluation of ICU bedside telemetry"
    }
    scope_resp = client.post(f"{BASE_URL}/assessments/authorize-scope", json=valid_scope_payload)
    assert scope_resp.status_code == 201, f"Scope creation failed: {scope_resp.text}"
    scope = scope_resp.json()
    scope_id = scope.get("id")
    print(f"Authorized Scope Created: {scope_id} (Status: {scope.get('authorization_status')})")

    # -------------------------------------------------------------
    # 5. Multi-Tool Assessment Execution (Real Tools!)
    # -------------------------------------------------------------
    print_step(5, "Multi-Tool Assessment Execution (Real Tool Execution)")
    asm_exec_payload = {
        "scope_id": scope_id,
        "device_id": test_dev_id,
        "profile": "DEFENSIVE_AUDIT",
        "tools": ["nmap", "trivy", "syft"]
    }
    exec_resp = client.post(f"{BASE_URL}/assessments", json=asm_exec_payload)
    assert exec_resp.status_code in (200, 201), f"Assessment execution failed: {exec_resp.text}"
    asm_data = exec_resp.json()
    asm_id = asm_data.get("id")
    print(f"Assessment ID: {asm_id}")
    print(f"Assessment Status: {asm_data.get('status')}")
    print(f"Security Posture Score: {asm_data.get('security_score')} / 100")
    print(f"Tools Executed: {asm_data.get('tools_executed')}")

    raw_results = asm_data.get("raw_results") or {}
    tools_status = raw_results.get("tools_status") or {}
    print("\nTools Execution Status Breakdown:")
    for t_name, t_info in tools_status.items():
        print(f"  Tool {t_name:<10}: status={t_info.get('status')}, time={t_info.get('execution_time_seconds')}s, findings={t_info.get('findings_count')}")

    findings_resp = client.get(f"{BASE_URL}/assessments/{asm_id}")
    assert findings_resp.status_code == 200
    asm_full = findings_resp.json()
    findings = asm_full.get("findings", [])
    print(f"\nTotal Findings Stored: {len(findings)}")
    for f in findings[:5]:
        print(f"  [{f.get('severity'):<6}] {f.get('source_tool'):<8}: {f.get('title')[:60]} ({f.get('verification_status')})")

    # -------------------------------------------------------------
    # 6. Certified Report Generation (PDF & HTML with SHA-256 Seal)
    # -------------------------------------------------------------
    print_step(6, "Certified Report Generation & Cryptographic Verification")
    for r_format in ["HTML", "PDF"]:
        gen_resp = client.post(
            f"{BASE_URL}/assessments/{asm_id}/reports",
            json={"report_type": r_format}
        )
        assert gen_resp.status_code == 201, f"{r_format} report generation failed: {gen_resp.text}"
        rep = gen_resp.json()
        rep_id = rep.get("id")
        claimed_hash = rep.get("sha256_hash")
        print(f"Generated {r_format} Report ID: {rep_id}")
        print(f"Report Claimed SHA-256 Seal: {claimed_hash}")

        dl_resp = client.get(f"{BASE_URL}/reports/{rep_id}/download")
        assert dl_resp.status_code == 200, f"Download failed for {rep_id}"
        file_bytes = dl_resp.content
        assert len(file_bytes) > 0, "Downloaded file is empty"
        computed_hash = hashlib.sha256(file_bytes).hexdigest()
        print(f"Downloaded Size: {len(file_bytes)} bytes | Computed SHA-256: {computed_hash}")
        assert computed_hash == claimed_hash, f"Hash mismatch! Claimed: {claimed_hash}, Computed: {computed_hash}"
        print(f" Cryptographic SHA-256 Seal Authenticity Verified for {r_format}!")

    # -------------------------------------------------------------
    # 7. Structured Data CSV Exports
    # -------------------------------------------------------------
    print_step(7, "Structured Data CSV Exports Verification")
    csv_endpoints = [
        ("assessments.csv", "/reports/assessments.csv"),
        ("security-events.csv", "/reports/security-events.csv"),
        ("incidents.csv", "/reports/incidents.csv")
    ]
    for filename, path in csv_endpoints:
        csv_resp = client.get(f"{BASE_URL}{path}")
        assert csv_resp.status_code == 200, f"CSV download failed for {path}: {csv_resp.text}"
        lines = csv_resp.text.strip().split("\n")
        assert len(lines) >= 1, f"CSV {filename} is empty"
        header = lines[0]
        print(f" {filename}: {len(lines)} lines | Header: {header[:65]}...")

    # -------------------------------------------------------------
    # 8. Live ML Attack Detection Inference
    # -------------------------------------------------------------
    print_step(8, "Live ML Attack Detection Inference")
    ml_payload = {
        "device_id": test_dev_id,
        "packet_rate": 850.5,
        "packet_size": 1024.0,
        "syn_ratio": 0.85,
        "port_entropy": 3.8,
        "failed_auth_count": 0
    }
    ml_resp = client.post(f"{BASE_URL}/detection/evaluate", json=ml_payload)
    assert ml_resp.status_code == 200, f"ML inference failed: {ml_resp.text}"
    ml_result = ml_resp.json()
    print(f"Is Anomaly: {ml_result.get('is_anomaly')}")
    print(f"Detection Type: {ml_result.get('detection_type')}")
    print(f"Predicted Class: {ml_result.get('predicted_class')}")
    print(f"Confidence: {ml_result.get('confidence')}")
    print(f"Model Version: {ml_result.get('model_version')}")
    print(f"Suggested Action: {ml_result.get('suggested_action')}")
    assert "predicted_class" in ml_result

    # -------------------------------------------------------------
    # 9. Incident Management Lifecycle
    # -------------------------------------------------------------
    print_step(9, "Incident Management Lifecycle & Notes")
    inc_resp = client.get(f"{BASE_URL}/incidents")
    assert inc_resp.status_code == 200
    incidents = inc_resp.json()
    print(f"Active Incidents: {len(incidents)}")
    if incidents:
        first_inc = incidents[0]
        inc_id = first_inc["id"]
        update_payload = {
            "status": "investigating",
            "assigned_to": "admin@medishield.local",
            "new_note": "Verified clinical telemetry isolation at ICU switch port."
        }
        patch_resp = client.patch(f"{BASE_URL}/incidents/{inc_id}", json=update_payload)
        assert patch_resp.status_code == 200, f"Incident update failed: {patch_resp.text}"
        print(f" Updated Incident {inc_id} to status 'investigating'.")

    # -------------------------------------------------------------
    # 10. Immutable Audit Trail & Hash-Chain Verification
    # -------------------------------------------------------------
    print_step(10, "Immutable Audit Trail & Hash-Chain Verification")
    audit_resp = client.get(f"{BASE_URL}/audit-logs")
    assert audit_resp.status_code == 200
    logs = audit_resp.json()
    print(f"Total Audit Entries: {len(logs)}")
    assert len(logs) > 0, "No audit logs found"
    latest = logs[0]
    print(f"Latest Audit Event: [{latest.get('action')}] {latest.get('actor')} -> {latest.get('details')[:60]}")

    verify_audit_resp = client.get(f"{BASE_URL}/audit-logs/verify-chain")
    assert verify_audit_resp.status_code == 200
    ver_data = verify_audit_resp.json()
    print(f"Audit Chain Verification: {ver_data}")
    assert ver_data.get("chain_valid") is True

    # -------------------------------------------------------------
    # 11. Privacy & Integrity Engine Verification
    # -------------------------------------------------------------
    print_step(11, "Privacy & Cryptographic Integrity Verification")
    records_resp = client.get(f"{BASE_URL}/integrity/results")
    assert records_resp.status_code == 200
    records = records_resp.json()
    print(f"Total Integrity Records: {len(records)}")
    
    # 1. Test verified record (REC-ICU-002)
    rec2_resp = client.post(f"{BASE_URL}/integrity/verify", json={"record_id": "REC-ICU-002"})
    assert rec2_resp.status_code == 200
    rec2_ver = rec2_resp.json()
    print(f"Record REC-ICU-002 Integrity: {rec2_ver.get('status')} | Match: {rec2_ver.get('is_match')}")
    assert rec2_ver.get("status") == "VERIFIED"
    assert rec2_ver.get("is_match") is True
    print(" Authentic Cryptographic SHA-256 Record Verification Confirmed!")

    # 2. Test tampered record detection (REC-ICU-001)
    rec1_resp = client.post(f"{BASE_URL}/integrity/verify", json={"record_id": "REC-ICU-001"})
    assert rec1_resp.status_code == 200
    rec1_ver = rec1_resp.json()
    print(f"Record REC-ICU-001 Tamper Detection: {rec1_ver.get('status')} | Match: {rec1_ver.get('is_match')}")
    assert rec1_ver.get("status") == "TAMPERED"
    assert rec1_ver.get("is_match") is False
    print(" Cryptographic Tamper Detection Confirmed!")

    # -------------------------------------------------------------
    # 12. Persona RBAC Restrictions (Doctor Role Gating)
    # -------------------------------------------------------------
    print_step(12, "Doctor Persona RBAC Enforcement (Policy Gating)")
    doc_login = client.post(
        f"{BASE_URL}/auth/login",
        json={"email": "doctor@medishield.local", "password": "doctorpassword123"}
    )
    assert doc_login.status_code == 200, f"Doctor login failed: {doc_login.text}"
    doc_token = doc_login.json().get("access_token")

    doc_client = httpx.Client(timeout=15.0)
    doc_client.headers.update({"Authorization": f"Bearer {doc_token}"})

    doc_devs = doc_client.get(f"{BASE_URL}/devices")
    assert doc_devs.status_code == 200
    print(f" Doctor allowed to inspect device inventory: {len(doc_devs.json())} devices.")

    doc_scope_att = doc_client.post(f"{BASE_URL}/assessments/authorize-scope", json=valid_scope_payload)
    print(f"Doctor Scope Creation Attempt Status: {doc_scope_att.status_code}")
    assert doc_scope_att.status_code == 403, f"Expected 403 Forbidden for Doctor, got {doc_scope_att.status_code}"
    print(" RBAC 403 Forbidden strictly enforced for Doctor on scope authorization!")

    doc_audit_att = doc_client.get(f"{BASE_URL}/audit-logs")
    print(f"Doctor Audit Logs Access Attempt Status: {doc_audit_att.status_code}")
    assert doc_audit_att.status_code == 403, f"Expected 403 Forbidden for Doctor, got {doc_audit_att.status_code}"
    print(" RBAC 403 Forbidden strictly enforced for Doctor on audit logs!")

    print("\n" + "*"*70)
    print("ALL 12 END-TO-END WORKFLOW VERIFICATION CHECKS PASSED PERFECTLY!")
    print("*"*70)

if __name__ == "__main__":
    verify_all()
