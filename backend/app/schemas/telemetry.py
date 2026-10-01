"""Pydantic schemas for Telemetry ingestion and querying."""

from datetime import datetime
from typing import Dict, Any, Optional
from pydantic import BaseModel, Field, ConfigDict


class TelemetryCreate(BaseModel):
    device_id: str = Field(..., min_length=3, max_length=50)
    metrics: Dict[str, Any] = Field(..., description="Simulated clinical metrics like HR, SPO2, glucose, flow")
    network_stats: Dict[str, Any] = Field(..., description="Network flow features like packet_count, byte_rate, syn_ratio")
    is_anomaly: Optional[bool] = False


class TelemetryResponse(BaseModel):
    id: str
    device_id: str
    metrics: Dict[str, Any]
    network_stats: Dict[str, Any]
    is_anomaly: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
