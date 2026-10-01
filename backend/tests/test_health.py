"""Tests for the health check endpoint."""

from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_root_endpoint():
    """Verify root endpoint returns project info and status."""
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "online"
    assert "MediShield" in data["project"]
    assert data["health"] == "/api/health"


def test_health_endpoint():
    """Verify health endpoint returns 200 OK and expected structure."""
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "project" in data
    assert "version" in data
    assert "timestamp" in data
    assert "services" in data
    assert data["services"]["api"] == "operational"
