"""Security Events API Endpoints."""

from typing import List, Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.models.db_models import SecurityEventModel, AuditLogModel, UserModel
from app.schemas.security_event import SecurityEventResponse, SecurityEventUpdate
from app.middleware.rbac import get_current_user, require_analyst

router = APIRouter(prefix="/security-events", tags=["Security Events"])


@router.get("", response_model=List[SecurityEventResponse])
def list_security_events(
    severity: Optional[str] = Query(None, description="Filter by low, medium, high, critical"),
    status: Optional[str] = Query(None, description="Filter by open, investigating, resolved, false_positive"),
    device_id: Optional[str] = Query(None, description="Filter by device ID"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    """Retrieve security events with optional severity and status filters."""
    query = db.query(SecurityEventModel)
    if severity:
        query = query.filter(SecurityEventModel.severity == severity)
    if status:
        query = query.filter(SecurityEventModel.status == status)
    if device_id:
        query = query.filter(SecurityEventModel.device_id == device_id)

    return query.order_by(SecurityEventModel.timestamp.desc()).offset(skip).limit(limit).all()


@router.get("/{event_id}", response_model=SecurityEventResponse)
def get_security_event(
    event_id: str,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    """Retrieve details and evidence payload for a specific security event."""
    evt = db.query(SecurityEventModel).filter(SecurityEventModel.id == event_id).first()
    if not evt:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Security event {event_id} not found."
        )
    return evt


@router.patch("/{event_id}", response_model=SecurityEventResponse)
def update_security_event(
    event_id: str,
    payload: SecurityEventUpdate,
    db: Session = Depends(get_db),
    analyst_user: UserModel = Depends(require_analyst)
):
    """Acknowledge or update triage status of a security event (Security Analyst role)."""
    evt = db.query(SecurityEventModel).filter(SecurityEventModel.id == event_id).first()
    if not evt:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Security event {event_id} not found."
        )

    if payload.status:
        evt.status = payload.status
    if payload.suggested_action:
        evt.suggested_action = payload.suggested_action

    audit = AuditLogModel(
        actor=analyst_user.email,
        role=analyst_user.role,
        action="SECURITY_EVENT_TRIAGED",
        entity_type="SecurityEvent",
        entity_id=evt.id,
        details=f"Event status updated to {evt.status}.",
        status="success"
    )
    db.add(audit)
    db.commit()
    db.refresh(evt)
    return evt
