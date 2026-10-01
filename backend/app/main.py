"""MediShield IoMT Security & Privacy Platform - FastAPI Backend Application."""

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.database.init_db import seed_database

# Import API Routers
from app.api.health import router as health_router
from app.api.auth import router as auth_router
from app.api.devices import router as devices_router
from app.api.telemetry import router as telemetry_router
from app.api.security_events import router as security_events_router
from app.api.incidents import router as incidents_router
from app.api.detection import router as detection_router
from app.api.integrity import router as integrity_router
from app.api.audit_logs import router as audit_logs_router
from app.api.reports import router as reports_router
from app.api.simulation import router as simulation_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Execute startup and shutdown tasks."""
    # Ensure database schema is created and seeded with synthetic demo records
    try:
        seed_database()
    except Exception as e:
        print(f"Warning: Database auto-seed encountered error: {e}")
    yield


app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description=(
        "MediShield is an academic IoMT cybersecurity research prototype providing "
        "intrusion detection, security monitoring, RBAC, authenticated encryption (AES-256-GCM), "
        "and SHA-256 data integrity verification."
    ),
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan
)

# Narrow CORS configuration for prototype security
origins = settings.CORS_ORIGINS if isinstance(settings.CORS_ORIGINS, list) else [settings.CORS_ORIGINS]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization", "X-Requested-With"],
)

# Register API Routers under /api
app.include_router(health_router, prefix=settings.API_V1_STR)
app.include_router(auth_router, prefix=settings.API_V1_STR)
app.include_router(devices_router, prefix=settings.API_V1_STR)
app.include_router(telemetry_router, prefix=settings.API_V1_STR)
app.include_router(security_events_router, prefix=settings.API_V1_STR)
app.include_router(incidents_router, prefix=settings.API_V1_STR)
app.include_router(detection_router, prefix=settings.API_V1_STR)
app.include_router(integrity_router, prefix=settings.API_V1_STR)
app.include_router(audit_logs_router, prefix=settings.API_V1_STR)
app.include_router(reports_router, prefix=settings.API_V1_STR)
app.include_router(simulation_router, prefix=settings.API_V1_STR)


@app.get("/", tags=["Root"])
async def root():
    """Root entrypoint providing basic service metadata."""
    return {
        "project": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "status": "online",
        "documentation": "/docs",
        "health": f"{settings.API_V1_STR}/health",
    }
