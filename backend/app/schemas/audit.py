"""Pydantic schemas for Audit Logging."""

from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict


class AuditLogResponse(BaseModel):
    id: str
    timestamp: datetime
    actor: str
    role: str
    action: str
    entity_type: str
    entity_id: Optional[str] = None
    ip_address: str
    details: Optional[str] = None
    status: str

    model_config = ConfigDict(from_attributes=True)
