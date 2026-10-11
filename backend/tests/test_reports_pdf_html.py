"""Tests for PDF/HTML Report Generation, Incident Notes, and Assessment Cancellation."""

import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.database.init_db import seed_database

seed_database()
client = TestClient(app)


@pytest.fixture
def analyst_token():
    resp = client.post("/api/auth/login", json={
        "email": "analyst@medishield.local",
        "password": "analystpassword123"
    })
    assert resp.status_code == 200
    return resp.json()["access_token"]


def test_assessment_flow_and_report_generation(analyst_token):
    headers = {"Authorization": f"Bearer {analyst_token}"}

    # 1. Authorize scope
    scope_resp = client.post("/api/v1/assessments/authorize-scope", json={
        "device_id": "DEV-ECG-001",
        "target_ip": "192.168.10.45",
        "assessment_profile": "DEFENSIVE_AUDIT",
        "selected_tools": ["nmap", "nuclei"],
        "duration_hours": 4,
        "justification": "Routine quarterly audit"
    }, headers=headers)
    assert scope_resp.status_code == 201
    scope_id = scope_resp.json()["id"]

    # 2. Execute assessment
    exec_resp = client.post("/api/v1/assessments/execute", json={
        "scope_id": scope_id,
        "device_id": "DEV-ECG-001",
        "profile": "DEFENSIVE_AUDIT",
        "tools": ["nmap", "nuclei"]
    }, headers=headers)
    assert exec_resp.status_code == 201
    asm_data = exec_resp.json()
    asm_id = asm_data["id"]
    assert asm_data["status"] == "COMPLETED"
    assert "findings" in asm_data
    assert len(asm_data["findings"]) > 0

    # 3. Generate PDF Report via /api/v1/assessments/{id}/reports
    pdf_resp = client.post(f"/api/v1/assessments/{asm_id}/reports", json={
        "report_type": "PDF"
    }, headers=headers)
    assert pdf_resp.status_code == 201
    pdf_meta = pdf_resp.json()
    assert pdf_meta["report_type"] == "PDF"
    assert len(pdf_meta["sha256_hash"]) == 64
    assert pdf_meta["file_size_bytes"] > 0
    pdf_id = pdf_meta["id"]

    # Download PDF
    download_resp = client.get(f"/api/v1/reports/{pdf_id}/download", headers=headers)
    assert download_resp.status_code == 200
    assert download_resp.headers["content-type"] == "application/pdf"
    assert len(download_resp.content) > 100

    # 4. Generate HTML Report via /api/v1/reports/assessments/{id}
    html_resp = client.post(f"/api/v1/reports/assessments/{asm_id}", json={
        "report_type": "HTML"
    }, headers=headers)
    assert html_resp.status_code == 201
    html_meta = html_resp.json()
    assert html_meta["report_type"] == "HTML"
    assert len(html_meta["sha256_hash"]) == 64
    html_id = html_meta["id"]

    # View HTML
    view_resp = client.get(f"/api/v1/reports/{html_id}/html", headers=headers)
    assert view_resp.status_code == 200
    assert "text/html" in view_resp.headers["content-type"]
    assert "MediShield Assessment Report" in view_resp.text

    # 5. List Reports
    list_resp = client.get(f"/api/v1/reports?assessment_id={asm_id}", headers=headers)
    assert list_resp.status_code == 200
    reports = list_resp.json()
    assert len(reports) >= 2


def test_incident_notes_and_status_update(analyst_token):
    headers = {"Authorization": f"Bearer {analyst_token}"}

    # 1. Create Incident
    create_resp = client.post("/api/v1/incidents", json={
        "title": "Suspected telemetry tamper on ECG monitor",
        "description": "Anomaly detector triggered for unauthorized parameter deviation.",
        "severity": "high",
        "device_id": "DEV-ECG-001"
    }, headers=headers)
    assert create_resp.status_code == 201
    inc = create_resp.json()
    inc_id = inc["id"]

    # 2. Add Analyst Note via POST /incidents/{id}/notes
    note_resp = client.post(f"/api/v1/incidents/{inc_id}/notes", json={
        "content": "Initiated packet inspection on VLAN 10. Device isolating temporarily."
    }, headers=headers)
    assert note_resp.status_code == 200
    updated_inc = note_resp.json()
    assert any("Initiated packet inspection" in n.get("text", "") for n in updated_inc["notes"])

    # 3. Update Status via PATCH /incidents/{id}/status
    status_resp = client.patch(f"/api/v1/incidents/{inc_id}/status", json={
        "status": "investigating",
        "resolution_notes": "Under active triage"
    }, headers=headers)
    assert status_resp.status_code == 200
    status_inc = status_resp.json()
    assert status_inc["status"] == "investigating"


def test_assessment_cancellation(analyst_token):
    headers = {"Authorization": f"Bearer {analyst_token}"}

    # 1. Authorize scope
    scope_resp = client.post("/api/v1/assessments/authorize-scope", json={
        "device_id": "DEV-PUMP-204",
        "target_ip": "192.168.10.88",
        "assessment_profile": "DEFENSIVE_AUDIT",
        "selected_tools": ["nmap"],
        "duration_hours": 1,
        "justification": "Cancel test"
    }, headers=headers)
    assert scope_resp.status_code == 201

    # Create dummy queued assessment directly or test cancel on existing
    # Authorize & test cancellation
    list_asm = client.get("/api/v1/assessments", headers=headers)
    if list_asm.status_code == 200 and len(list_asm.json()) > 0:
        asm_id = list_asm.json()[0]["id"]
        cancel_resp = client.post(f"/api/v1/assessments/{asm_id}/cancel", headers=headers)
        assert cancel_resp.status_code == 200
