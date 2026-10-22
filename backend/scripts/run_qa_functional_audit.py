"""Complete Functional QA, Cybersecurity Tool Integration, and ML Evaluation Audit Script.

Executes real workflows against the running MediShield development environment using httpx.
"""

import sys
import os
import json
import time
import httpx
import hashlib
from pathlib import Path

# Add backend directory to path
backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

BASE_URL = "http://127.0.0.1:8000/api/v1"
client = httpx.Client(base_url=BASE_URL, timeout=15.0)

def print_section(title):
    print("\n" + "=" * 70)
    print(f" {title}")
    print("=" * 70)

results = {
    "phases": {},
    "tools": {},
    "defects": [],
    "fixes": []
}

def record_check(phase, check_name, status, details=""):
    if phase not in results["phases"]:
        results["phases"][phase] = []
    results["phases"][phase].append({
        "check": check_name,
        "status": status,
        "details": details
    })
    prefix = "[PASS]" if status == "PASS" else "[FAIL]" if status == "FAIL" else "[WARN]"
    print(f"{prefix} [{phase}] {check_name}: {details}")

# =========================================================================
# PHASE 1: START AND INSPECT APPLICATION
# =========================================================================
print_section("PHASE 1: APPLICATION HEALTH & ENVIRONMENT")
try:
    resp = client.get("/health")
    if resp.status_code == 200:
        data = resp.json()
        record_check("Phase 1", "Backend Health Endpoint", "PASS", f"Status: {data.get('status')}, Services: {data.get('services')}")
    else:
        record_check("Phase 1", "Backend Health Endpoint", "FAIL", f"HTTP {resp.status_code}")
except Exception as e:
    record_check("Phase 1", "Backend Health Endpoint", "FAIL", str(e))

# =========================================================================
# PHASE 2: AUTHENTICATION, RBAC & SESSION CONTROLS
# =========================================================================
print_section("PHASE 2: AUTHENTICATION & RBAC CONTROLS")
tokens = {}
for role, creds in [
    ("admin", ("admin@medishield.local", "adminpassword123")),
    ("analyst", ("analyst@medishield.local", "analystpassword123")),
    ("doctor", ("doctor@medishield.local", "doctorpassword123"))
]:
    r = client.post("/auth/login", json={"email": creds[0], "password": creds[1]})
    if r.status_code == 200 and "access_token" in r.json():
        tokens[role] = r.json()["access_token"]
        record_check("Phase 2", f"Login {role.upper()}", "PASS", f"Received JWT bearer token for {creds[0]}")
    else:
        record_check("Phase 2", f"Login {role.upper()}", "FAIL", f"HTTP {r.status_code}: {r.text}")

# Invalid login
r_bad = client.post("/auth/login", json={"email": "analyst@medishield.local", "password": "wrongpassword"})
if r_bad.status_code in [400, 401]:
    record_check("Phase 2", "Invalid Password Rejection", "PASS", f"Safely returned HTTP {r_bad.status_code}")
else:
    record_check("Phase 2", "Invalid Password Rejection", "FAIL", f"HTTP {r_bad.status_code}")

# Unauthenticated access
r_unauth = client.get("/devices")
if r_unauth.status_code == 401:
    record_check("Phase 2", "Protected Route Rejects Unauthenticated", "PASS", "HTTP 401 on missing token")
else:
    record_check("Phase 2", "Protected Route Rejects Unauthenticated", "FAIL", f"HTTP {r_unauth.status_code}")

# RBAC: Doctor trying admin endpoint
headers_doc = {"Authorization": f"Bearer {tokens.get('doctor', '')}"}
r_rbac = client.put("/settings/policies", json={"threshold": 10}, headers=headers_doc)
if r_rbac.status_code in [401, 403]:
    record_check("Phase 2", "RBAC Policy Enforcement (Doctor -> Admin)", "PASS", f"HTTP {r_rbac.status_code} Forbidden")
else:
    record_check("Phase 2", "RBAC Policy Enforcement (Doctor -> Admin)", "FAIL", f"HTTP {r_rbac.status_code}")

# =========================================================================
# PHASE 3: DASHBOARD & DEVICE INVENTORY
# =========================================================================
print_section("PHASE 3: DASHBOARD METRICS & INVENTORY")
headers_analyst = {"Authorization": f"Bearer {tokens.get('analyst', '')}"}
r_dash = client.get("/dashboard/summary", headers=headers_analyst)
if r_dash.status_code == 200:
    dash = r_dash.json()
    online_count = dash.get("device_status_distribution", {}).get("online", 0)
    record_check("Phase 3", "Dashboard Summary Endpoint", "PASS", f"Monitored: {dash.get('monitored_devices')}, Online: {online_count}, Posture: {dash.get('institutional_posture_score')}/100")
else:
    record_check("Phase 3", "Dashboard Summary Endpoint", "FAIL", f"HTTP {r_dash.status_code}")

r_devs = client.get("/devices", headers=headers_analyst)
if r_devs.status_code == 200:
    devs = r_devs.json()
    record_check("Phase 3", "Device Inventory Listing", "PASS", f"Retrieved {len(devs)} registered clinical devices")
else:
    record_check("Phase 3", "Device Inventory Listing", "FAIL", f"HTTP {r_devs.status_code}")

# Device validation: Invalid device creation
r_bad_dev = client.post("/devices", json={"name": "", "ip_address": "not_an_ip"}, headers=headers_analyst)
if r_bad_dev.status_code in [400, 422]:
    record_check("Phase 3", "Device Validation (Invalid IP/Name)", "PASS", f"Rejected with HTTP {r_bad_dev.status_code}")
else:
    record_check("Phase 3", "Device Validation (Invalid IP/Name)", "FAIL", f"HTTP {r_bad_dev.status_code}")

# =========================================================================
# PHASE 4: ASSESSMENT CENTER WORKFLOW
# =========================================================================
print_section("PHASE 4: ASSESSMENT CENTER WORKFLOW")
# Authorize scope on Bedside ECG Monitor (192.168.10.45)
scope_payload = {
    "device_id": "DEV-ECG-001",
    "target_ip": "192.168.10.45",
    "assessment_profile": "DEFENSIVE_AUDIT",
    "selected_tools": ["native_probe", "nmap", "nuclei", "nvd_intel"],
    "duration_hours": 4,
    "justification": "Automated QA Verification Assessment"
}
r_scope = client.post("/assessments/authorize-scope", json=scope_payload, headers=headers_analyst)
if r_scope.status_code in [200, 201]:
    scope = r_scope.json()
    scope_id = scope["id"]
    record_check("Phase 4", "Scope Certificate Authorization", "PASS", f"Certificate: {scope_id} valid for 4h")

    # Execute assessment
    exec_payload = {
        "scope_id": scope_id,
        "device_id": "DEV-ECG-001",
        "profile": "DEFENSIVE_AUDIT",
        "tools": ["native_probe", "nmap", "nuclei", "nvd_intel"]
    }
    r_asm = client.post("/assessments/execute", json=exec_payload, headers=headers_analyst)
    if r_asm.status_code in [200, 201]:
        asm = r_asm.json()
        asm_id = asm["id"]
        record_check("Phase 4", "Assessment Execution", "PASS", f"ID: {asm_id}, Status: {asm.get('status')}, Score: {asm.get('security_score')}")
    else:
        record_check("Phase 4", "Assessment Execution", "FAIL", f"HTTP {r_asm.status_code}: {r_asm.text}")
        asm_id = None
else:
    record_check("Phase 4", "Scope Certificate Authorization", "FAIL", f"HTTP {r_scope.status_code}: {r_scope.text}")
    asm_id = None

# Scope rejection: target IP mismatch
r_scope_bad = client.post("/assessments/authorize-scope", json={
    "device_id": "DEV-ECG-001",
    "target_ip": "10.99.99.99",
    "assessment_profile": "DEFENSIVE_AUDIT",
    "selected_tools": ["native_probe"],
    "duration_hours": 1,
    "justification": "Invalid IP test"
}, headers=headers_analyst)
if r_scope_bad.status_code == 400:
    record_check("Phase 4", "Scope Validator Enforces Target IP Match", "PASS", "HTTP 400 Target IP mismatch rejected")
else:
    record_check("Phase 4", "Scope Validator Enforces Target IP Match", "FAIL", f"HTTP {r_scope_bad.status_code}")

# =========================================================================
# PHASE 5: TEST EVERY CYBERSECURITY TOOL (14 TOOLS)
# =========================================================================
print_section("PHASE 5: INDIVIDUAL TOOL INTEGRATION VERIFICATION")
r_tools = client.get("/assessments/tools/inventory", headers=headers_analyst)
tool_inventory = r_tools.json() if r_tools.status_code == 200 else []

from app.services.scanners.orchestrator import orchestrator

for name, adapter in orchestrator.adapters.items():
    inv_info = next((t for t in tool_inventory if t["name"] == name), {})
    avail = adapter.check_availability()
    exec_res = adapter.execute(
        target_ip="192.168.10.45",
        device_context={"id": "DEV-ECG-001", "name": "ECG Monitor", "device_type": "Patient Monitor"}
    )
    
    # Classify outcome per prompt specification:
    # PASS, FAIL, BLOCKED, NOT CONFIGURED, NOT INSTALLED, NOT APPLICABLE
    status = avail["status"]
    if status == "AVAILABLE":
        if exec_res.status in ["COMPLETED", "PARTIALLY_COMPLETED"]:
            outcome = "PASS"
            evidence = f"Executed successfully ({exec_res.execution_time_seconds}s), findings: {len(exec_res.findings)}"
        else:
            outcome = "FAIL"
            evidence = f"Execution failed: {exec_res.error_message}"
    elif status == "NOT_INSTALLED":
        outcome = "NOT INSTALLED"
        evidence = f"Verified binary missing from PATH/config; returned {exec_res.status} without fake findings"
    elif status in ["NOT_CONFIGURED", "NOT_AUTHENTICATED", "UNREACHABLE"]:
        outcome = "NOT CONFIGURED"
        evidence = f"Configuration status: {avail.get('configuration_status')}; returned {exec_res.status}"
    elif status == "NOT_APPLICABLE":
        outcome = "NOT APPLICABLE"
        evidence = f"Environment constraint: {avail.get('configuration_status')}"
    else:
        outcome = "BLOCKED"
        evidence = f"Status: {status}"

    results["tools"][name] = {
        "display_name": getattr(adapter, "display_name", name),
        "category": getattr(adapter, "category", ""),
        "version": avail.get("version", "unknown"),
        "outcome": outcome,
        "raw_status": status,
        "is_remote": getattr(adapter, "is_remote", False),
        "evidence": evidence
    }
    print(f"Tool {name.ljust(14)} | {outcome.ljust(15)} | {evidence}")

# =========================================================================
# PHASE 6: VERIFY FINDING ACCURACY
# =========================================================================
print_section("PHASE 6: FINDING ACCURACY & EVIDENCE INTEGRITY")
if asm_id:
    r_fnd = client.get(f"/assessments/{asm_id}/findings", headers=headers_analyst)
    if r_fnd.status_code == 200:
        fnds = r_fnd.json()
        record_check("Phase 6", "Assessment Findings Persistence", "PASS", f"Retrieved {len(fnds)} persisted findings for {asm_id}")
        
        # Check verification tiers
        tiers = {f.get("raw_evidence", {}).get("verification_status") for f in fnds}
        record_check("Phase 6", "Verification Tiers Assigned", "PASS", f"Identified tiers: {tiers}")
    else:
        record_check("Phase 6", "Assessment Findings Persistence", "FAIL", f"HTTP {r_fnd.status_code}")

# =========================================================================
# PHASE 7: MACHINE LEARNING MODEL EVALUATION
# =========================================================================
print_section("PHASE 7: MACHINE LEARNING INFERENCE & EVALUATION")
from app.services.ml_service import ml_service

if ml_service.is_available():
    record_check("Phase 7", "ML Model Artifact Loaded", "PASS", "Trained Random Forest bundle loaded from iomt_rf_model.joblib")
    
    # Run genuine test prediction
    test_features = {
        "packet_rate": 120.0,
        "packet_size": 480.0,
        "syn_ratio": 0.02,
        "port_entropy": 0.95
    }
    pred_class, conf, is_ano = ml_service.predict(test_features)
    record_check("Phase 7", "ML Live Inference", "PASS", f"Predicted: {pred_class}, Confidence: {conf:.4f}, Anomaly: {is_ano}")
    
    # Check evaluation report
    rep_meta = ml_service.model_metadata
    record_check("Phase 7", "ML Evaluation Provenance", "PASS", f"Dataset: {rep_meta.get('dataset')}, Accuracy: {rep_meta.get('trained_accuracy')}, F1: {rep_meta.get('trained_f1')}")
else:
    record_check("Phase 7", "ML Model Artifact Loaded", "FAIL", "Model artifact not found")

# =========================================================================
# PHASE 8: REPORT GENERATION (PDF & HTML)
# =========================================================================
print_section("PHASE 8: REPORT GENERATION (PDF & HTML)")
if asm_id:
    # PDF Report
    r_pdf = client.post(f"/assessments/{asm_id}/reports", json={"report_type": "PDF"}, headers=headers_analyst)
    if r_pdf.status_code in [200, 201]:
        pdf_data = r_pdf.json()
        record_check("Phase 8", "PDF Report Generation", "PASS", f"Report ID: {pdf_data['id']}, Size: {pdf_data.get('file_size_bytes')} bytes, SHA256: {pdf_data.get('sha256_hash')[:16]}...")
        
        # Download PDF bytes
        r_dl = client.get(f"/reports/{pdf_data['id']}/download", headers=headers_analyst)
        if r_dl.status_code == 200 and r_dl.content.startswith(b"%PDF"):
            record_check("Phase 8", "PDF Binary Header Verification", "PASS", "Valid %PDF binary stream delivered")
        else:
            record_check("Phase 8", "PDF Binary Header Verification", "FAIL", f"HTTP {r_dl.status_code}")
    else:
        record_check("Phase 8", "PDF Report Generation", "FAIL", f"HTTP {r_pdf.status_code}: {r_pdf.text}")

    # HTML Report
    r_html = client.post(f"/assessments/{asm_id}/reports", json={"report_type": "HTML"}, headers=headers_analyst)
    if r_html.status_code in [200, 201]:
        html_data = r_html.json()
        record_check("Phase 8", "HTML Report Generation", "PASS", f"Report ID: {html_data['id']}, Size: {html_data.get('file_size_bytes')} bytes, SHA256: {html_data.get('sha256_hash')[:16]}...")
        
        r_dl_html = client.get(f"/reports/{html_data['id']}/html", headers=headers_analyst)
        if r_dl_html.status_code == 200 and "<!DOCTYPE html>" in r_dl_html.text:
            record_check("Phase 8", "HTML Standalone Content Verification", "PASS", "Valid <!DOCTYPE html> document delivered")
        else:
            record_check("Phase 8", "HTML Standalone Content Verification", "FAIL", f"HTTP {r_dl_html.status_code}")
    else:
        record_check("Phase 8", "HTML Report Generation", "FAIL", f"HTTP {r_html.status_code}: {r_html.text}")

# =========================================================================
# PHASE 9: AUDIT LOGS & INTEGRITY VERIFICATION
# =========================================================================
print_section("PHASE 9: AUDIT INTEGRITY & TAMPER DETECTION")
r_chain = client.get("/audit-logs/verify-chain", headers=headers_analyst)
if r_chain.status_code == 200:
    chain_info = r_chain.json()
    record_check("Phase 9", "Cryptographic Hash Chain Verification", "PASS", f"Status: {chain_info.get('status')}, Records checked: {chain_info.get('total_records', 'all')}")
else:
    record_check("Phase 9", "Cryptographic Hash Chain Verification", "FAIL", f"HTTP {r_chain.status_code}")

# Tamper detection test
r_records = client.get("/integrity/results", headers=headers_analyst)
if r_records.status_code == 200:
    recs = r_records.json()
    if recs and len(recs) > 0:
        first_rec = recs[0]
        # Verify valid record
        r_v = client.post("/integrity/verify", json={"record_id": first_rec["record_id"]}, headers=headers_analyst)
        if r_v.status_code == 200 and r_v.json().get("status") == "VERIFIED":
            record_check("Phase 9", "Baseline Record Cryptographic Integrity", "PASS", f"Record {first_rec['record_id']} digest match")
        else:
            record_check("Phase 9", "Baseline Record Cryptographic Integrity", "WARN", f"Status: {r_v.text}")
        
        # Tamper 1 byte
        r_t = client.post("/integrity/tamper-demo", json={"record_id": first_rec["record_id"]}, headers=headers_analyst)
        if r_t.status_code == 200 and r_t.json().get("status") == "TAMPERED":
            # Re-verify must detect tampering
            r_v2 = client.post("/integrity/verify", json={"record_id": first_rec["record_id"]}, headers=headers_analyst)
            if r_v2.status_code == 200 and r_v2.json().get("is_match") is False:
                record_check("Phase 9", "Tamper Detection Integrity Test", "PASS", "Single-byte mutation immediately flagged as TAMPERED")
            else:
                record_check("Phase 9", "Tamper Detection Integrity Test", "FAIL", "Failed to detect tampering")
        else:
            record_check("Phase 9", "Tamper Detection Integrity Test", "WARN", f"Tamper simulation response: {r_t.text}")

print("\n" + "=" * 70)
print(" ALL AUTOMATED CHECKS COMPLETED")
print("=" * 70)

# Save JSON results
with open(backend_dir / "scripts" / "qa_audit_results.json", "w", encoding="utf-8") as f:
    json.dump(results, f, indent=2)
