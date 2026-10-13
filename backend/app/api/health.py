"""Health check API endpoints."""

from datetime import datetime, timezone
from fastapi import APIRouter
from app.config import settings
from app.schemas.health import HealthResponse
from app.services.ml_service import ml_service

router = APIRouter(tags=["Health"])


@router.get("/health", response_model=HealthResponse, summary="System Health Status")
async def get_health() -> HealthResponse:
    """Returns the operational status of MediShield backend services."""
    return HealthResponse(
        status="healthy",
        project=settings.PROJECT_NAME,
        version=settings.VERSION,
        environment=settings.ENVIRONMENT,
        timestamp=datetime.now(timezone.utc),
        services={
            "api": "operational",
            "database": "operational (sqlite)",
            "ml_inference": "operational (model_active)" if ml_service.is_available() else "pending_model_training",
        },
    )
