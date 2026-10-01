"""Pydantic schemas for Incident Management."""

from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field, ConfigDict


class IncidentCreate(BaseModel):
    id: Optional[str] = None
    title: str = Field(..., min_length=3, max_length=255)
    description: str = Field(..., min_length=5)
    severity: str = Field(..., pattern="^(low|medium|high|critical)$")
    status: Optional[str] = Field(default="new", pattern="^(new|investigating|resolved|closed)$")
    assigned_to: Optional[str] = None
    device_id: Optional[str] = None
    notes: Optional[List[Dict[str, Any]]] = Field(default_factory=list)


class IncidentUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    severity: Optional[str] = Field(None, pattern="^(low|medium|high|critical)$")
    status: Optional[str] = Field(None, pattern="^(new|investigating|resolved|closed)$")
    assigned_to: Optional[str] = None
    resolution_notes: Optional[str] = None
    new_note: Optional[str] = None


class IncidentResponse(BaseModel):
    id: str
    title: str
    description: str
    severity: str
    status: str
    assigned_to: Optional[str] = None
    device_id: Optional[str] = None
    resolution_notes: Optional[str] = None
    notes: List[Dict[str, Any]]
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
