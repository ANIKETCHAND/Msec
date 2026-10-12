"""Automated Tests for Dashboard Summary and Phase 1 Architecture Foundation."""

import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_dashboard_summary_authenticated():
    """Verify authenticated analyst can retrieve live dashboard summary metrics."""
    # 1. Login as Security Analyst
    login_resp = client.post("/api/v1/auth/login", json={
        "email": "analyst@medishield.local",
        "password": "analystpassword123"
    })
    assert login_resp.status_code == 200
    token = login_resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Query Dashboard Summary on primary /api/v1 route
    resp = client.get("/api/v1/dashboard/summary", headers=headers)
    assert resp.status_code == 200
    data = resp.json()

    # Verify metric fields
    assert "monitored_devices" in data
    assert data["monitored_devices"] >= 6
    assert "assessed_devices" in data
    assert "critical_findings" in data
    assert "high_findings" in data
    assert "active_security_events" in data
    assert "open_incidents" in data
    assert "institutional_posture_score" in data
    assert 0 <= data["institutional_posture_score"] <= 100

    # Verify distributions
    assert "device_status_distribution" in data
    dist = data["device_status_distribution"]
    assert "online" in dist
    assert "offline" in dist
    assert "suspicious_isolated" in dist

    # Verify correlation ID header is set
    assert "X-Request-ID" in resp.headers
    assert resp.headers["X-Request-ID"].startswith("req-")


def test_dashboard_summary_legacy_alias():
    """Verify legacy /api/dashboard/summary route works for backward-compatibility."""
    login_resp = client.post("/api/auth/login", json={
        "email": "analyst@medishield.local",
        "password": "analystpassword123"
    })
    token = login_resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    resp = client.get("/api/dashboard/summary", headers=headers)
    assert resp.status_code == 200
    assert resp.json()["data_source"] == "live_database"


def test_unauthenticated_request_standardized_error_envelope():
    """Verify unauthenticated requests return standardized error JSON envelope with request_id."""
    resp = client.get("/api/v1/dashboard/summary")
    assert resp.status_code == 401
    body = resp.json()

    # Must contain both 'detail' (for Starlette compatibility) and 'error' envelope
    assert "detail" in body
    assert "error" in body
    err = body["error"]
    assert err["code"] == "UNAUTHORIZED"
    assert "message" in err
    assert "request_id" in err
    assert "timestamp" in err
