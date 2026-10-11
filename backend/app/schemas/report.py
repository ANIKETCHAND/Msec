"""Pydantic Schemas for Security Assessment Reports."""

from datetime import datetime
from typing import Optional, Dict, Any, List
from pydantic import BaseModel, Field, ConfigDict


class ReportGenerateRequest(BaseModel):
    report_type: str = Field(default="PDF", pattern="^(PDF|HTML)$", description="Format to generate (PDF or HTML)")


class ReportResponse(BaseModel):
    id: str
    assessment_id: str
    device_id: Optional[str] = None
    title: str
    report_type: str
    file_size_bytes: int
    sha256_hash: str
    generated_by: str
    summary: Optional[str] = None
    meta_info: Dict[str, Any] = Field(default_factory=dict)
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ReportListResponse(BaseModel):
    reports: List[ReportResponse]
    total: int
