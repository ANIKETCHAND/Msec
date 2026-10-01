"""Pydantic schemas for Cryptographic Integrity & Privacy."""

from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field, ConfigDict


class IntegrityVerifyRequest(BaseModel):
    record_id: str = Field(..., min_length=3, max_length=50)


class IntegrityVerifyResponse(BaseModel):
    record_id: str
    status: str  # VERIFIED, TAMPERED
    expected_hash: str
    computed_hash: str
    is_match: bool
    verified_at: datetime
    message: str


class IntegrityTamperRequest(BaseModel):
    record_id: str = Field(..., min_length=3, max_length=50)


class IntegrityRecordResponse(BaseModel):
    id: str
    record_id: str
    entity_type: str
    raw_payload: str
    encrypted_payload: Optional[str] = None
    sha256_hash: str
    status: str
    last_verified: datetime

    model_config = ConfigDict(from_attributes=True)
