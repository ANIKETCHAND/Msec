"""MediShield IoMT Security & Privacy Platform - FastAPI Backend Application."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.api.health import router as health_router

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description=(
        "MediShield is an academic IoMT cybersecurity research prototype providing "
        "intrusion detection, security monitoring, RBAC, authenticated encryption, "
        "and data integrity verification."
    ),
    docs_url="/docs",
    redoc_url="/redoc",
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

# Include API Routers
app.include_router(health_router, prefix=settings.API_V1_STR)


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
