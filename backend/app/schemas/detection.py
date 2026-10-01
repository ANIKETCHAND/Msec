"""Pydantic schemas for Intrusion Detection & Simulation."""

from datetime import datetime
from typing import Optional, Dict, Any, List
from pydantic import BaseModel, Field


class DetectionEvaluateRequest(BaseModel):
    device_id: str
    packet_rate: float = Field(..., ge=0)
    packet_size: float = Field(..., ge=0)
    syn_ratio: float = Field(..., ge=0, le=1)
    port_entropy: float = Field(..., ge=0)
    failed_auth_count: Optional[int] = Field(0, ge=0)


class DetectionEvaluateResponse(BaseModel):
    is_anomaly: bool
    detection_type: str  # Rule-Based, ML Classification, Normal
    rule_triggered: Optional[str] = None
    predicted_class: str
    confidence: float
    model_version: str
    severity: str
    suggested_action: str
    evaluated_at: datetime


class SimulationScenarioResponse(BaseModel):
    scenario: str
    status: str
    affected_device: str
    event_generated: Optional[str] = None
    message: str
