"""Health check schemas."""

from datetime import datetime
from typing import Dict, Any
from pydantic import BaseModel, Field


class HealthResponse(BaseModel):
    """Health check response payload schema."""

    status: str = Field(default="healthy", description="Application operational status")
    project: str = Field(..., description="Project name")
    version: str = Field(..., description="Application version")
    environment: str = Field(..., description="Deployment environment")
    timestamp: datetime = Field(..., description="UTC timestamp of the health check")
    services: Dict[str, Any] = Field(
        default_factory=dict,
        description="Status of connected external services (Database, ML model, etc.)"
    )
