"""Telemetry Ingestion and Surveillance API Endpoints."""

import uuid
from typing import List, Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.models.db_models import TelemetryModel, DeviceModel, SecurityEventModel, UserModel
from app.schemas.telemetry import TelemetryCreate, TelemetryResponse
from app.middleware.rbac import get_current_user
from app.services.detection_engine import detection_engine
from app.services.ml_service import ml_service

router = APIRouter(tags=["Telemetry"])


@router.get("/telemetry", response_model=List[TelemetryResponse])
def list_telemetry(
    device_id: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    """Retrieve recent simulated telemetry streams."""
    query = db.query(TelemetryModel)
    if device_id:
        query = query.filter(TelemetryModel.device_id == device_id)
    return query.order_by(TelemetryModel.created_at.desc()).limit(limit).all()


@router.post("/telemetry", response_model=TelemetryResponse, status_code=status.HTTP_201_CREATED)
def ingest_telemetry(
    payload: TelemetryCreate,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    """
    Ingest synthetic device telemetry. Automatically executes rule-based intrusion checks
    and ML flow classification. If suspicious activity is detected, creates a Security Event.
    """
    device = db.query(DeviceModel).filter(DeviceModel.id == payload.device_id).first()
    if not device:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Device {payload.device_id} not registered."
        )

    # Update device last_seen timestamp
    device.last_seen = datetime.now(timezone.utc)

    # 1. Evaluate against rule engine
    rule_violation = detection_engine.evaluate_telemetry(
        device_id=device.id,
        network_stats=payload.network_stats,
        device_status=device.status
    )

    is_anomaly = payload.is_anomaly

    if rule_violation:
        rule_id, rule_name, severity, evidence, action = rule_violation
        is_anomaly = True

        # Automatically spawn SecurityEvent in DB
        evt = SecurityEventModel(
            id=f"EVT-AUTO-{int(datetime.now(timezone.utc).timestamp())}-{uuid.uuid4().hex[:4]}",
            device_id=device.id,
            event_type=rule_id.split("-")[1] + "_DETECTED",
            severity=severity,
            rule_id=rule_id,
            rule_name=rule_name,
            evidence=evidence,
            suggested_action=action,
            status="open"
        )
        db.add(evt)

        # Elevate device risk level
        if severity == "critical":
            device.risk_level = "critical"
        elif severity == "high" and device.risk_level != "critical":
            device.risk_level = "high"

    # Persist telemetry record
    record = TelemetryModel(
        device_id=payload.device_id,
        metrics=payload.metrics,
        network_stats=payload.network_stats,
        is_anomaly=is_anomaly
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


@router.get("/devices/{device_id}/telemetry", response_model=List[TelemetryResponse])
def get_device_telemetry(
    device_id: str,
    limit: int = Query(30, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    """Retrieve historical telemetry readings for a specific medical device."""
    return db.query(TelemetryModel)\
        .filter(TelemetryModel.device_id == device_id)\
        .order_by(TelemetryModel.created_at.desc())\
        .limit(limit)\
        .all()
