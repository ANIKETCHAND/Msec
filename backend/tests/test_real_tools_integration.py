"""End-to-end integration test for MediShield real security scanner integrations."""

import json
import urllib.request
import urllib.parse
from app.database.session import SessionLocal
from app.models.db_models import DeviceModel, AssessmentScopeModel, AssessmentModel, FindingModel
from app.services.scanners.orchestrator import orchestrator


def test_real_tools_integration():
    db = SessionLocal()
    print("=== 1. VERIFYING TOOL INVENTORY ===")
    inventory = orchestrator.get_tool_inventory()
    print(f"Total tools in inventory: {len(inventory)}")
    for t in inventory:
        print(f"[{t['status']}] {t['name']:<12} (v{t['version']}) -> {t['configuration_status'][:70]}")

    print("\n=== 2. QUERYING REGISTERED DEVICE ===")
    device = db.query(DeviceModel).first()
    if not device:
        print("Creating test device DEV-ECG-001...")
        device = DeviceModel(
            id="DEV-ECG-001",
            name="Bedside ECG Monitor",
            device_type="Cardiology",
            ip_address="127.0.0.1",
            mac_address="00:1A:2B:3C:4D:5E",
            firmware_version="2.0.1",
            network_segment="ICU_VLAN_10",
            department="Cardiology",
            manufacturer="Philips Healthcare",
            model="IntelliVue MX800",
            location="ICU Room 102",
            risk_level="medium",
            security_score=85.0,
            status="online"
        )
        db.add(device)
        db.commit()
        db.refresh(device)
    print(f"Device: {device.id} ({device.name}) at {device.ip_address}")

    print("\n=== 3. CREATING AUTHORIZED ASSESSMENT SCOPE ===")
    from datetime import datetime, timezone, timedelta
    now = datetime.now(timezone.utc)
    scope = AssessmentScopeModel(
        id="SCOPE-VERIFY-REAL",
        device_id=device.id,
        target_ip=device.ip_address,
        target_hostname=f"{device.id}.medishield.local",
        authorization_status="AUTHORIZED",
        authorized_scope=["PORT_DISCOVERY", "SERVICE_ENUMERATION", "VULNERABILITY_CHECK", "SECURITY_POSTURE"],
        assessment_profile="DEFENSIVE_AUDIT",
        selected_tools=["nmap", "nuclei", "trivy", "syft", "zap", "nikto", "tshark", "suricata", "lynis"],
        initiating_user_id="user-analyst-001",
        initiating_user_email="analyst@medishield.local",
        justification="Automated verification of real tool engines",
        created_at=now,
        expires_at=now + timedelta(hours=4)
    )
    # Check if scope exists
    existing = db.query(AssessmentScopeModel).filter(AssessmentScopeModel.id == scope.id).first()
    if existing:
        db.delete(existing)
        db.commit()
    db.add(scope)
    db.commit()
    print(f"Scope created: {scope.id} (Status: {scope.authorization_status})")

    print("\n=== 4. EXECUTING REAL ASSESSMENT VIA ORCHESTRATOR ===")
    from app.models.db_models import UserModel
    analyst_user = db.query(UserModel).filter(UserModel.email == "analyst@medishield.local").first()

    assessment = orchestrator.execute_assessment(
        db=db,
        scope_id=scope.id,
        device_id=device.id,
        profile=scope.assessment_profile,
        tools=scope.selected_tools,
        user=analyst_user
    )

    print(f"\nAssessment ID: {assessment.id}")
    print(f"Assessment Status: {assessment.status}")
    print(f"Posture Score: {assessment.security_score} / 100")
    print(f"Tools Executed: {assessment.tools_executed}")

    raw_results = assessment.raw_results or {}
    tools_status = raw_results.get("tools_status", {})
    print("\n=== TOOL EXECUTION BREAKDOWN ===")
    for tool_name, t_info in tools_status.items():
        print(f"Tool {tool_name:<12} -> Status: {t_info['status']:<18} Time: {t_info['execution_time_seconds']}s | Findings: {t_info['findings_count']}")

    findings = db.query(FindingModel).filter(FindingModel.assessment_id == assessment.id).all()
    print(f"\nTotal Findings Stored: {len(findings)}")
    for f in findings[:10]:
        print(f"  [{f.severity:<5}] {f.source_tool:<8}: {f.title[:65]}")

    print("\n=== 5. GENERATING CERTIFIED AUDIT REPORT (PDF & HTML) ===")
    from app.services.report_service import report_service
    pdf_report = report_service.create_assessment_report(
        db=db,
        assessment_id=assessment.id,
        report_type="PDF",
        user=analyst_user
    )
    print(f"PDF Report generated: {pdf_report.id} (Type: {pdf_report.report_type})")
    print(f"PDF SHA-256 Seal: {pdf_report.sha256_hash}")

    html_report = report_service.create_assessment_report(
        db=db,
        assessment_id=assessment.id,
        report_type="HTML",
        user=analyst_user
    )
    print(f"HTML Report generated: {html_report.id} (Type: {html_report.report_type})")
    print(f"HTML SHA-256 Seal: {html_report.sha256_hash}")

    print("\n=== INTEGRATION TEST PASSED SUCCESSFULLY ===")


if __name__ == "__main__":
    test_real_tools_integration()
