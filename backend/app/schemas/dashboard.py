"""Dashboard Summary Pydantic Schemas."""

from typing import List, Dict, Any, Optional
from datetime import datetime
from pydantic import BaseModel, Field


class DeviceStatusDistribution(BaseModel):
    online: int = 0
    online_pct: float = 0.0
    suspicious_isolated: int = 0
    suspicious_isolated_pct: float = 0.0
    offline: int = 0
    offline_pct: float = 0.0


class SecurityRiskDistribution(BaseModel):
    low: int = 0
    medium: int = 0
    high: int = 0
    critical: int = 0


class RecentAssessmentItem(BaseModel):
    id: str
    device_id: str
    target_ip: str
    profile: str
    status: str
    security_score: float
    total_findings: int
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None


class RecentEventItem(BaseModel):
    id: str
    device_id: Optional[str] = None
    rule_name: str
    severity: str
    status: str
    timestamp: datetime


class RecentIncidentItem(BaseModel):
    id: str
    title: str
    severity: str
    status: str
    device_id: Optional[str] = None
    assigned_to: Optional[str] = None
    created_at: datetime


class DashboardSummaryResponse(BaseModel):
    monitored_devices: int
    assessed_devices: int
    critical_findings: int
    high_findings: int
    active_security_events: int
    open_incidents: int
    critical_incidents: int
    institutional_posture_score: int
    device_status_distribution: DeviceStatusDistribution
    security_risk_distribution: SecurityRiskDistribution
    recent_assessments: List[RecentAssessmentItem]
    recent_security_events: List[RecentEventItem]
    recent_incidents: List[RecentIncidentItem]
    data_source: str = "live_database"
    timestamp: datetime
