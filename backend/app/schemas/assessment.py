"""Pydantic Schemas for Scope Authorization and Defensive Assessments."""

from datetime import datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field


class ScopeCreateRequest(BaseModel):
    device_id: str = Field(..., description="Target IoMT Device ID registered in MediShield")
    target_ip: str = Field(..., description="Target IP address matching registered device")
    target_hostname: Optional[str] = Field(None, description="Optional target hostname")
    assessment_profile: str = Field("DEFENSIVE_AUDIT", description="Profile: DEFENSIVE_AUDIT, PASSIVE_DISCOVERY, COMPLIANCE_SCAN")
    authorized_scope: List[str] = Field(
        default=["PORT_DISCOVERY", "SERVICE_ENUMERATION", "VULNERABILITY_CHECK", "SECURITY_POSTURE"],
        description="Authorized assessment actions"
    )
    selected_tools: List[str] = Field(
        default=["nmap"],
        description="Defensive assessment tools allowed"
    )
    duration_hours: int = Field(default=2, ge=1, le=24, description="Scope validity duration in hours (1-24)")
    justification: str = Field(..., min_length=5, description="Audited operational reason for authorization")


class ScopeResponse(BaseModel):
    id: str
    device_id: str
    target_ip: str
    target_hostname: Optional[str] = None
    authorization_status: str
    authorized_scope: List[str]
    assessment_profile: str
    selected_tools: List[str]
    initiating_user_id: str
    initiating_user_email: str
    justification: Optional[str] = None
    created_at: datetime
    expires_at: datetime
    revoked_at: Optional[datetime] = None
    revoked_by: Optional[str] = None

    model_config = {"from_attributes": True}


class FindingResponse(BaseModel):
    id: str
    assessment_id: str
    device_id: str
    title: str
    description: str
    severity: str
    category: str
    cve_id: Optional[str] = None
    cvss_score: Optional[float] = None
    affected_port: Optional[int] = None
    affected_service: Optional[str] = None
    source_tool: str
    remediation_guidance: Optional[str] = None
    raw_evidence: Optional[Dict[str, Any]] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class AssessmentLaunchRequest(BaseModel):
    scope_id: str = Field(..., description="Valid Scope ID authorizing this assessment")
    device_id: str = Field(..., description="Target Device ID")
    profile: str = Field("DEFENSIVE_AUDIT", description="Assessment profile to run")
    tools: List[str] = Field(default=["nmap"], description="Tools to execute (e.g. ['nmap'])")


class AssessmentResponse(BaseModel):
    id: str
    scope_id: str
    device_id: str
    target_ip: str
    status: str
    profile: str
    tools_executed: List[str]
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    total_findings: int
    critical_findings: int
    high_findings: int
    medium_findings: int
    low_findings: int
    security_score: float
    raw_results: Optional[Dict[str, Any]] = None
    summary: Optional[str] = None
    created_at: datetime
    findings: Optional[List[FindingResponse]] = None

    model_config = {"from_attributes": True}

