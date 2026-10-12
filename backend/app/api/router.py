"""Master API Router for MediShield IoMT Security Platform.

Provides unified registration for all domain-specific routers under the
versioned `/api/v1` namespace.
"""

from fastapi import APIRouter

from app.api.health import router as health_router
from app.api.auth import router as auth_router
from app.api.dashboard import router as dashboard_router
from app.api.devices import router as devices_router
from app.api.assessments import assessments_router
from app.api.reports import router as reports_router
from app.api.security_events import router as security_events_router
from app.api.incidents import router as incidents_router
from app.api.telemetry import router as telemetry_router
from app.api.detection import router as detection_router
from app.api.integrity import router as integrity_router
from app.api.audit_logs import router as audit_logs_router
from app.api.simulation import router as simulation_router
from app.api.settings import router as settings_router

api_v1_router = APIRouter()

# Register domain routers under versioned namespace
api_v1_router.include_router(health_router)
api_v1_router.include_router(auth_router)
api_v1_router.include_router(dashboard_router)
api_v1_router.include_router(devices_router)
api_v1_router.include_router(assessments_router)
api_v1_router.include_router(reports_router)
api_v1_router.include_router(security_events_router)
api_v1_router.include_router(incidents_router)
api_v1_router.include_router(telemetry_router)
api_v1_router.include_router(detection_router)
api_v1_router.include_router(integrity_router)
api_v1_router.include_router(audit_logs_router)
api_v1_router.include_router(simulation_router)
api_v1_router.include_router(settings_router)
