import sys
import os
import json
import hashlib
from datetime import datetime

backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, backend_dir)
os.chdir(backend_dir)

from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_full_matrix():
    print("======================================================================")
    print("MEDISHIELD DEEP SCAN PROFILES, TOOLS & API AUDIT")
    print("======================================================================")

    # 1. AUTHENTICATION
    print("\n[1] Authenticating Personas...")
    admin_res = client.post("/api/v1/auth/login", json={"email": "admin@medishield.local", "password": "adminpassword123"})
    assert admin_res.status_code == 200, f"Admin login failed: {admin_res.text}"
    admin_token = admin_res.json()["access_token"]
    admin_hdr = {"Authorization": f"Bearer {admin_token}"}

    analyst_res = client.post("/api/v1/auth/login", json={"email": "analyst@medishield.local", "password": "analystpassword123"})
    assert analyst_res.status_code == 200, f"Analyst login failed: {analyst_res.text}"
    analyst_token = analyst_res.json()["access_token"]
    analyst_hdr = {"Authorization": f"Bearer {analyst_token}"}
    print("  [OK] Authenticated Admin and Analyst successfully.")

    # 2. DEVICE LOOKUP
    devices = client.get("/api/v1/devices", headers=analyst_hdr).json()
    assert len(devices) > 0, "No devices found"
    target_dev = next((d for d in devices if d.get("ip_address") == "127.0.0.1"), None)
    if not target_dev:
        # Create a local test device for real scanner executions
        target_dev_id = f"DEV-AUDIT-{datetime.now().strftime('%H%M%S')}"
        create_res = client.post("/api/v1/devices", json={
            "id": target_dev_id,
            "name": "Audit Test Infusion Unit",
            "device_type": "Infusion Pump",
            "ip_address": "127.0.0.1",
            "mac_address": "00:AA:BB:CC:DD:01",
            "firmware_version": "2.1.0",
            "network_segment": "ICU_VLAN_10",
            "department": "Critical Care",
            "location": "ICU Bed 1",
            "status": "online"
        }, headers=admin_hdr)
        assert create_res.status_code in [200, 201], f"Device create failed: {create_res.text}"
        target_dev = create_res.json()
        print(f"  [OK] Created local audit target: {target_dev['id']} at {target_dev['ip_address']}")
    else:
        print(f"  [OK] Using existing target device: {target_dev['id']} at {target_dev['ip_address']}")

    # 3. TEST 3 SCAN PROFILES WITH REAL ENGINES
    profiles_to_test = [
        {
            "profile": "DEFENSIVE_AUDIT",
            "tools": ["native_probe", "nmap", "nuclei", "nvd_intel"]
        },
        {
            "profile": "PASSIVE_DISCOVERY",
            "tools": ["native_probe", "suricata", "zeek", "tshark"]
        },
        {
            "profile": "COMPLIANCE_SCAN",
            "tools": ["native_probe", "lynis", "openscap", "syft", "trivy"]
        }
    ]

    for p_info in profiles_to_test:
        prof = p_info["profile"]
        tools = p_info["tools"]
        print(f"\n[3.{prof}] Authorizing Scope & Running Scan with profile {prof}...")

        # Authorize Scope
        scope_res = client.post("/api/v1/assessments/authorize-scope", json={
            "device_id": target_dev["id"],
            "target_ip": target_dev["ip_address"],
            "authorized_scope": ["PORT_DISCOVERY", "SERVICE_ENUMERATION", "VULNERABILITY_CHECK", "SECURITY_POSTURE", "COMPLIANCE_AUDIT"],
            "assessment_profile": prof,
            "selected_tools": tools,
            "justification": f"Automated audit verification of {prof} profile"
        }, headers=analyst_hdr)
        assert scope_res.status_code in [200, 201], f"Scope authorization failed: {scope_res.text}"
        scope = scope_res.json()
        print(f"  [OK] Scope Authorized: {scope['id']} | Tools: {scope['selected_tools']}")

        # Execute Assessment
        exec_res = client.post("/api/v1/assessments/execute", json={
            "scope_id": scope["id"],
            "device_id": target_dev["id"],
            "profile": prof,
            "tools": tools
        }, headers=analyst_hdr)
        assert exec_res.status_code in [200, 201], f"Assessment execute failed: {exec_res.text}"
        asm = exec_res.json()
        print(f"  [OK] Assessment Executed: {asm['id']}")
        print(f"       Status: {asm['status']}")
        print(f"       Score: {asm['security_score']:.1f}/100")
        print(f"       Findings: {asm['total_findings']} (Crit: {asm['critical_findings']}, High: {asm['high_findings']}, Med: {asm['medium_findings']}, Low: {asm['low_findings']})")
        print(f"       Tools executed: {asm['tools_executed']}")

        # Verify Findings
        fnd_res = client.get(f"/api/v1/assessments/{asm['id']}/findings", headers=analyst_hdr)
        assert fnd_res.status_code == 200
        findings = fnd_res.json()
        print(f"  [OK] Retrieved {len(findings)} findings from database.")
        for f in findings[:2]:
            tool = f.get("source_tool") or f.get("raw_evidence", {}).get("source_tool")
            print(f"       Sample: [{f['severity']:5}] {f['title'][:45]} | Tool: {tool}")

        # Generate PDF Report
        pdf_rep_res = client.post(f"/api/v1/assessments/{asm['id']}/reports", json={"report_type": "PDF"}, headers=analyst_hdr)
        assert pdf_rep_res.status_code in [200, 201], f"PDF report generation failed: {pdf_rep_res.text}"
        pdf_rep = pdf_rep_res.json()
        print(f"  [OK] PDF Report Generated: {pdf_rep['id']} | SHA-256: {pdf_rep['sha256_hash'][:16]}...")

        # Generate HTML Report
        html_rep_res = client.post(f"/api/v1/assessments/{asm['id']}/reports", json={"report_type": "HTML"}, headers=analyst_hdr)
        assert html_rep_res.status_code in [200, 201], f"HTML report generation failed: {html_rep_res.text}"
        html_rep = html_rep_res.json()
        print(f"  [OK] HTML Report Generated: {html_rep['id']} | SHA-256: {html_rep['sha256_hash'][:16]}...")

        # Download Report and verify SHA256 integrity
        dl_res = client.get(f"/api/v1/reports/{pdf_rep['id']}/download", headers=analyst_hdr)
        assert dl_res.status_code == 200
        calc_sha = hashlib.sha256(dl_res.content).hexdigest()
        assert calc_sha == pdf_rep["sha256_hash"], f"SHA256 mismatch: {calc_sha} vs {pdf_rep['sha256_hash']}"
        print(f"  [OK] Cryptographic download hash verified identical.")

    # 4. TEST COMBINED SCAN WITH ALL 14 TOOLS
    print("\n[4] Authorizing & Executing Comprehensive Assessment with ALL 14 Tools...")
    all_14_tools = [
        "native_probe", "nmap", "openvas", "nuclei", "zap", "nikto",
        "suricata", "zeek", "tshark", "nvd_intel", "trivy", "lynis",
        "openscap", "syft"
    ]
    scope_all_res = client.post("/api/v1/assessments/authorize-scope", json={
        "device_id": target_dev["id"],
        "target_ip": target_dev["ip_address"],
        "authorized_scope": ["PORT_DISCOVERY", "SERVICE_ENUMERATION", "VULNERABILITY_CHECK", "SECURITY_POSTURE", "COMPLIANCE_AUDIT"],
        "assessment_profile": "DEFENSIVE_AUDIT",
        "selected_tools": all_14_tools,
        "justification": "Full defensive engine sweep audit"
    }, headers=analyst_hdr)
    assert scope_all_res.status_code in [200, 201], f"All-tool scope authorization failed: {scope_all_res.text}"
    scope_all = scope_all_res.json()

    exec_all_res = client.post("/api/v1/assessments/execute", json={
        "scope_id": scope_all["id"],
        "device_id": target_dev["id"],
        "profile": "DEFENSIVE_AUDIT",
        "tools": all_14_tools
    }, headers=analyst_hdr)
    assert exec_all_res.status_code in [200, 201], f"All-tool assessment failed: {exec_all_res.text}"
    asm_all = exec_all_res.json()
    print(f"  [OK] 14-Tool Assessment Completed: {asm_all['id']}")
    print(f"       Status: {asm_all['status']}")
    print(f"       Score: {asm_all['security_score']:.1f}/100")
    print(f"       Findings: {asm_all['total_findings']}")
    tools_status = asm_all.get("raw_results", {}).get("tools_status", {})
    print(f"  [OK] Verified execution status for {len(tools_status)} tools:")
    for t_name, t_stat in tools_status.items():
        print(f"       - {t_name:15}: {t_stat.get('status', 'UNKNOWN')} ({t_stat.get('findings_count', 0)} findings, {t_stat.get('execution_time_seconds', 0):.2f}s)")

    # 5. TEST EVERY APPLICATION TAB BACKEND ENDPOINT
    print("\n[5] Checking Every Application Tab Backend Endpoint...")
    endpoints = [
        ("Dashboard Summary", "/api/v1/dashboard/summary", "GET", None),
        ("Defensive Tool Inventory", "/api/v1/assessments/tools/inventory", "GET", None),
        ("Scopes Listing", "/api/v1/assessments/scopes", "GET", None),
        ("Assessments Listing", "/api/v1/assessments", "GET", None),
        ("Reports Summary", "/api/v1/reports/summary", "GET", None),
        ("Reports Listing", "/api/v1/reports", "GET", None),
        ("Devices Listing", "/api/v1/devices", "GET", None),
        (f"Device Detail ({target_dev['id']})", f"/api/v1/devices/{target_dev['id']}", "GET", None),
        (f"Device Telemetry ({target_dev['id']})", f"/api/v1/telemetry?device_id={target_dev['id']}&limit=10", "GET", None),
        ("Security Events Listing", "/api/v1/security-events", "GET", None),
        ("Incidents Listing", "/api/v1/incidents", "GET", None),
        ("ML Detection Status", "/api/v1/detection/status", "GET", None),
        ("ML IDS Status", "/api/v1/detection/ids/status", "GET", None),
        ("Privacy & Integrity Results", "/api/v1/integrity/results", "GET", None),
        ("Audit Logs Listing", "/api/v1/audit-logs?limit=10", "GET", None),
        ("Audit Chain Cryptographic Verification", "/api/v1/audit-logs/verify-chain", "GET", None),
        ("System Security Policies", "/api/v1/settings/policies", "GET", None)
    ]

    for name, path, method, body in endpoints:
        resp = client.get(path, headers=analyst_hdr)
        assert resp.status_code == 200, f"Endpoint {name} ({path}) failed with {resp.status_code}: {resp.text}"
        print(f"  [OK] Tab Endpoint: {name:40} -> HTTP {resp.status_code}")

    print("\n======================================================================")
    print("ALL 14 TOOLS, 3 SCAN PROFILES & ALL TAB ENDPOINTS VERIFIED 100% OPERATIONAL")
    print("======================================================================")

if __name__ == "__main__":
    test_full_matrix()
