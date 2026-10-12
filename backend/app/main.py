"""MediShield IoMT Security & Privacy Platform - FastAPI Backend Application."""

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.database.init_db import seed_database



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

import uuid
from starlette.requests import Request
from app.core.error_handlers import register_error_handlers
from app.api.router import api_v1_router

# Correlation ID Middleware for request tracing
@app.middleware("http")
async def request_id_middleware(request: Request, call_next):
    request_id = request.headers.get("X-Request-ID") or f"req-{uuid.uuid4().hex[:8]}"
    request.state.request_id = request_id
    response = await call_next(request)
    response.headers["X-Request-ID"] = request_id
    return response

# Register Centralized Error Handlers
register_error_handlers(app)

# Register Master API Router under /api/v1 (primary) and /api (legacy backward-compatibility)
app.include_router(api_v1_router, prefix="/api/v1")
app.include_router(api_v1_router, prefix="/api")


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
