"""Unit and Integration Tests for 14 Defensive Cybersecurity Tool Integrations in MediShield."""

import pytest
import os
import tempfile
import json
from fastapi.testclient import TestClient

from app.main import app
from app.services.scanners.orchestrator import orchestrator
from app.services.scanners.base import ToolStatus, ToolCategory
from app.services.scope_validator import ALLOWED_DEFENSIVE_TOOLS
from app.services.scanners.suricata_adapter import SuricataAdapter
from app.services.scanners.zeek_adapter import ZeekAdapter
from app.services.scanners.tshark_adapter import TSharkAdapter
from app.services.scanners.nvd_adapter import NvdAdapter
from app.services.scanners.trivy_adapter import TrivyAdapter
from app.services.scanners.lynis_adapter import LynisAdapter
from app.services.scanners.openscap_adapter import OpenSCAPAdapter
from app.services.scanners.syft_adapter import SyftAdapter


client = TestClient(app)


def get_analyst_token():
    resp = client.post("/api/auth/login", json={"email": "analyst@medishield.local", "password": "analystpassword123"})
    assert resp.status_code == 200, f"Login failed: {resp.text}"
    return resp.json()["access_token"]


def test_all_14_tools_registered_in_orchestrator():
    """Verifies that all 14 requested defensive tools are registered with standard categories."""
    inventory = orchestrator.get_tool_inventory()
    assert len(inventory) == 14, f"Expected 14 tools, got {len(inventory)}"

    tool_names = {t["name"] for t in inventory}
    expected_tools = {
        "native_probe", "nmap", "openvas", "nuclei", "zap", "nikto",
        "suricata", "zeek", "tshark", "nvd_intel", "trivy", "lynis",
        "openscap", "syft"
    }
    assert tool_names == expected_tools, f"Missing tools: {expected_tools - tool_names}"

    # Check categories
    categories = {t["category"] for t in inventory}
    assert ToolCategory.CORE_DISCOVERY in categories
    assert ToolCategory.VULNERABILITY_ASSESSMENT in categories
    assert ToolCategory.WEB_ASSESSMENT in categories
    assert ToolCategory.NETWORK_MONITORING in categories
    assert ToolCategory.VULNERABILITY_INTELLIGENCE in categories
    assert ToolCategory.HOST_SOFTWARE_ASSESSMENT in categories


def test_scope_validator_allows_all_14_tools():
    """Verifies that scope validator whitelist includes all 14 defensive tools."""
    for tool_name in orchestrator.adapters.keys():
        assert tool_name in ALLOWED_DEFENSIVE_TOOLS, f"Tool '{tool_name}' not in ALLOWED_DEFENSIVE_TOOLS"


def test_native_probe_available_and_executes():
    """Verifies native probe availability and safe socket/TLS checks."""
    adapter = orchestrator.adapters["native_probe"]
    avail = adapter.check_availability()
    assert avail["status"] == ToolStatus.AVAILABLE
    assert avail["available"] is True

    result = adapter.execute(
        target_ip="127.0.0.1",
        device_context={"id": "DEV-TEST", "name": "Test Device", "device_type": "Infusion Pump"}
    )
    assert result.status == "COMPLETED"
    assert result.available is True
    assert isinstance(result.findings, list)


def test_nvd_intel_available_and_clinical_correlation():
    """Verifies NVD & clinical IoMT threat intelligence adapter."""
    adapter = NvdAdapter()
    avail = adapter.check_availability()
    assert avail["status"] == ToolStatus.AVAILABLE
    assert avail["available"] is True

    # Test correlation against known medical device
    result = adapter.execute(
        target_ip="192.168.10.50",
        device_context={
            "id": "DEV-PUMP",
            "name": "Baxter Spectrum Infusion Pump",
            "device_type": "Infusion Pump",
            "model": "Spectrum V8"
        }
    )
    assert result.status == "COMPLETED"
    assert len(result.findings) >= 1
    # Check that CVSS score is assigned
    assert any(f.cve_id == "CVE-2020-25165" for f in result.findings)


def test_suricata_eve_json_telemetry_ingestion():
    """Verifies Suricata EVE JSON alert ingestion and parsing when log exists."""
    with tempfile.NamedTemporaryFile(mode="w", suffix=".json", delete=False) as tf:
        eve_line = {
            "timestamp": "2026-10-13T10:00:00.000000+0000",
            "event_type": "alert",
            "src_ip": "10.0.0.100",
            "dest_ip": "192.168.10.50",
            "alert": {
                "action": "allowed",
                "gid": 1,
                "signature_id": 2010999,
                "rev": 1,
                "signature": "ET CLINICAL DICOM Cleartext Command Injection Attempt",
                "category": "Medical Device Protocol Anomaly",
                "severity": 1
            }
        }
        tf.write(json.dumps(eve_line) + "\n")
        temp_eve = tf.name

    try:
        adapter = SuricataAdapter(eve_path=temp_eve)
        avail = adapter.check_availability()
        assert avail["status"] == ToolStatus.AVAILABLE

        result = adapter.execute(
            target_ip="192.168.10.50",
            device_context={"id": "DEV-50", "name": "Infusion Gateway"}
        )
        assert result.status == "COMPLETED"
        assert len(result.findings) == 1
        assert "DICOM Cleartext" in result.findings[0].title
        assert result.findings[0].verification_status == "Confirmed Vulnerability"
    finally:
        if os.path.exists(temp_eve):
            os.remove(temp_eve)


def test_zeek_tsv_log_ingestion():
    """Verifies Zeek HTTP and connection log ingestion."""
    with tempfile.TemporaryDirectory() as temp_dir:
        # Create a mock http.log
        http_log = os.path.join(temp_dir, "http.log")
        with open(http_log, "w", encoding="utf-8") as f:
            f.write("#separator \\x09\n")
            f.write("#fields\tts\tuid\tid.orig_h\tid.orig_p\tid.resp_h\tid.resp_p\tmethod\thost\turi\n")
            f.write("1600000000.0\tC123\t192.168.1.10\t45000\t192.168.1.20\t80\tGET\tmed-pump.local\t/api/status\n")

        adapter = ZeekAdapter(log_dir=temp_dir)
        avail = adapter.check_availability()
        assert avail["status"] == ToolStatus.AVAILABLE

        result = adapter.execute(
            target_ip="192.168.1.10",
            device_context={"id": "DEV-PUMP", "name": "Bedside Pump"}
        )
        assert result.status == "COMPLETED"
        assert any("Unencrypted HTTP" in f.title for f in result.findings)


def test_tools_inventory_api_endpoint():
    """Verifies GET /api/v1/assessments/tools/inventory returns full schema."""
    token = get_analyst_token()
    resp = client.get(
        "/api/v1/assessments/tools/inventory",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, list)
    assert len(data) == 14

    for item in data:
        assert "name" in item
        assert "display_name" in item
        assert "category" in item
        assert "status" in item
        assert "available" in item
        assert "is_remote" in item
        assert "supported_capabilities" in item


def test_tools_refresh_api_endpoint():
    """Verifies POST /api/v1/assessments/tools/refresh triggers live status probe."""
    token = get_analyst_token()
    resp = client.post(
        "/api/v1/assessments/tools/refresh",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) == 14
