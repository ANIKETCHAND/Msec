"""Pydantic schemas for Device Management."""

from datetime import datetime
from typing import Optional, Dict, Any, List
from pydantic import BaseModel, Field, ConfigDict


class DeviceBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=255)
    device_type: str = Field(..., min_length=2, max_length=100)
    ip_address: str = Field(..., min_length=7, max_length=45)
    mac_address: str = Field(..., min_length=11, max_length=17)
    firmware_version: str = Field(..., min_length=1, max_length=50)
    network_segment: str = Field(..., min_length=2, max_length=100)
    status: str = Field(default="online", pattern="^(online|offline|suspicious|isolated)$")
    risk_level: str = Field(default="low", pattern="^(low|medium|high|critical)$")
    meta_info: Optional[Dict[str, Any]] = Field(default_factory=dict)


class DeviceCreate(DeviceBase):
    id: str = Field(..., min_length=3, max_length=50)


class DeviceUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=255)
    device_type: Optional[str] = None
    ip_address: Optional[str] = None
    mac_address: Optional[str] = None
    firmware_version: Optional[str] = None
    network_segment: Optional[str] = None
    status: Optional[str] = Field(None, pattern="^(online|offline|suspicious|isolated)$")
    risk_level: Optional[str] = Field(None, pattern="^(low|medium|high|critical)$")
    meta_info: Optional[Dict[str, Any]] = None


class DeviceResponse(DeviceBase):
    id: str
    last_seen: datetime
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
