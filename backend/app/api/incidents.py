"""Incident Investigation and Management API Endpoints."""

from typing import List, Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.models.db_models import IncidentModel, AuditLogModel, UserModel
from app.schemas.incident import IncidentCreate, IncidentUpdate, IncidentResponse
from app.middleware.rbac import get_current_user, require_analyst

router = APIRouter(prefix="/incidents", tags=["Incidents"])


@router.get("", response_model=List[IncidentResponse])
def list_incidents(
    status: Optional[str] = Query(None, description="Filter by status: new, investigating, resolved, closed"),
    severity: Optional[str] = Query(None, description="Filter by severity"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    """Retrieve security incident tickets."""
    query = db.query(IncidentModel)
    if status:
        query = query.filter(IncidentModel.status == status)
    if severity:
        query = query.filter(IncidentModel.severity == severity)
    return query.order_by(IncidentModel.created_at.desc()).offset(skip).limit(limit).all()


@router.post("", response_model=IncidentResponse, status_code=status.HTTP_201_CREATED)
def create_incident(
    payload: IncidentCreate,
    db: Session = Depends(get_db),
    analyst_user: UserModel = Depends(require_analyst)
):
    """Create an incident ticket from an IoMT security alert (Security Analyst or Admin)."""
    incident_id = payload.id or f"INC-{datetime.now(timezone.utc).year}-{int(datetime.now(timezone.utc).timestamp()) % 10000:04d}"

    notes = payload.notes or []
    notes.append({
        "author": analyst_user.full_name,
        "time": datetime.now(timezone.utc).strftime("%H:%M:%S UTC"),
        "text": f"Incident ticket created by {analyst_user.full_name} ({analyst_user.role})."
    })

    inc = IncidentModel(
        id=incident_id,
        title=payload.title,
        description=payload.description,
        severity=payload.severity,
        status=payload.status or "new",
        assigned_to=payload.assigned_to or analyst_user.full_name,
        device_id=payload.device_id,
        notes=notes
    )
    db.add(inc)

    audit = AuditLogModel(
        actor=analyst_user.email,
        role=analyst_user.role,
        action="INCIDENT_CREATED",
        entity_type="Incident",
        entity_id=inc.id,
        details=f"Incident {inc.id} created with severity {inc.severity}.",
        status="success"
    )
    db.add(audit)
    db.commit()
    db.refresh(inc)
    return inc


@router.get("/{incident_id}", response_model=IncidentResponse)
def get_incident(
    incident_id: str,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    """Retrieve full incident details and investigation timeline."""
    inc = db.query(IncidentModel).filter(IncidentModel.id == incident_id).first()
    if not inc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Incident {incident_id} not found."
        )
    return inc


@router.patch("/{incident_id}", response_model=IncidentResponse)
def update_incident(
    incident_id: str,
    payload: IncidentUpdate,
    db: Session = Depends(get_db),
    analyst_user: UserModel = Depends(require_analyst)
):
    """Update incident status, assign analyst, or append investigation findings."""
    inc = db.query(IncidentModel).filter(IncidentModel.id == incident_id).first()
    if not inc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Incident {incident_id} not found."
        )

    if payload.status:
        inc.status = payload.status
    if payload.severity:
        inc.severity = payload.severity
    if payload.assigned_to:
        inc.assigned_to = payload.assigned_to
    if payload.resolution_notes:
        inc.resolution_notes = payload.resolution_notes

    current_notes = list(inc.notes or [])
    if payload.new_note:
        current_notes.append({
            "author": analyst_user.full_name,
            "time": datetime.now(timezone.utc).strftime("%H:%M:%S UTC"),
            "text": payload.new_note
        })
        inc.notes = current_notes

    inc.updated_at = datetime.now(timezone.utc)

    audit = AuditLogModel(
        actor=analyst_user.email,
        role=analyst_user.role,
        action="INCIDENT_STATUS_CHANGE",
        entity_type="Incident",
        entity_id=inc.id,
        details=f"Status: {inc.status}, Assigned: {inc.assigned_to}.",
        status="success"
    )
    db.add(audit)
    db.commit()
    db.refresh(inc)
    return inc


@router.post("/correlate/{device_id}", response_model=IncidentResponse)
def correlate_device_incidents(
    device_id: str,
    db: Session = Depends(get_db),
    analyst_user: UserModel = Depends(require_analyst)
):
    """Correlate disparate telemetry and assessment findings to identify attack chains."""
    from app.services.correlation_engine import correlation_engine
    inc = correlation_engine.correlate_device_events(db, device_id)
    if not inc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No multi-stage attack patterns identified for device {device_id}."
        )
    return inc

