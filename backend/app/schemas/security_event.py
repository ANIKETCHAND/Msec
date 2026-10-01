"""Pydantic schemas for Security Events."""

from datetime import datetime
from typing import Optional, Dict, Any
from pydantic import BaseModel, Field, ConfigDict


class SecurityEventCreate(BaseModel):
    id: Optional[str] = None
    device_id: Optional[str] = None
    event_type: str = Field(..., min_length=2, max_length=100)
    severity: str = Field(..., pattern="^(low|medium|high|critical)$")
    rule_id: str = Field(..., min_length=2, max_length=50)
    rule_name: str = Field(..., min_length=2, max_length=255)
    evidence: Optional[Dict[str, Any]] = Field(default_factory=dict)
    suggested_action: Optional[str] = None
    status: Optional[str] = Field(default="open", pattern="^(open|investigating|resolved|false_positive)$")


class SecurityEventUpdate(BaseModel):
    status: Optional[str] = Field(None, pattern="^(open|investigating|resolved|false_positive)$")
    suggested_action: Optional[str] = None


class SecurityEventResponse(BaseModel):
    id: str
    timestamp: datetime
    device_id: Optional[str] = None
    event_type: str
    severity: str
    rule_id: str
    rule_name: str
    evidence: Dict[str, Any]
    suggested_action: Optional[str] = None
    status: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
