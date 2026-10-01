"""Health check API endpoints."""

from datetime import datetime, timezone
from fastapi import APIRouter
from app.config import settings
from app.schemas.health import HealthResponse

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
            "database": "configured" if settings.SUPABASE_URL and "placeholder" not in settings.SUPABASE_URL else "not_configured (phase 1)",
            "ml_inference": "pending_model_training (phase 6)",
        },
    )
