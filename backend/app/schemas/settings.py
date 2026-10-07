"""Pydantic schemas for System Settings & Detection Policies."""

from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field, ConfigDict


class PolicyUpdateRequest(BaseModel):
    auth_failure_threshold: Optional[float] = Field(None, ge=1, le=50)
    packet_rate_dos_threshold: Optional[float] = Field(None, ge=10, le=10000)
    syn_ratio_threshold: Optional[float] = Field(None, ge=0.01, le=1.0)
    port_entropy_threshold: Optional[float] = Field(None, ge=0.1, le=10.0)
    heartbeat_timeout_sec: Optional[float] = Field(None, ge=10, le=3600)

    model_config = ConfigDict(from_attributes=True)


class PolicyResponse(BaseModel):
    id: str = "default"
    auth_failure_threshold: float
    packet_rate_dos_threshold: float
    syn_ratio_threshold: float
    port_entropy_threshold: float
    heartbeat_timeout_sec: float
    updated_at: datetime
    updated_by: str

    model_config = ConfigDict(from_attributes=True)
