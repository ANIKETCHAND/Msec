"""Device Inventory and Management API Endpoints."""

import random
import uuid
from typing import List, Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import or_
from app.database.session import get_db
from app.models.db_models import (
    DeviceModel,
    AuditLogModel,
    UserModel,
    AssessmentModel,
    AssessmentScopeModel,
    FindingModel,
    ReportModel,
)
from app.schemas.device import DeviceCreate, DeviceUpdate, DeviceResponse
from app.middleware.rbac import get_current_user, require_admin, require_analyst
from app.services.audit_chain_service import audit_chain_service

router = APIRouter(prefix="/devices", tags=["Devices"])


def _generate_device_id(db: Session, device_type: str) -> str:
    """Derive a unique DEV-<TYPE>-<nnn> inventory ID for a newly registered asset."""
    words = (device_type or "IOT").replace("-", " ").replace("_", " ").split()
    slug = "".join(ch for ch in words[-1].upper() if ch.isalnum())[:4] if words else ""
    slug = slug or "IOT"
    for _ in range(200):
        candidate = f"DEV-{slug}-{random.randint(100, 999)}"
        if not db.query(DeviceModel).filter(DeviceModel.id == candidate).first():
            return candidate
    return f"DEV-{slug}-{uuid.uuid4().hex[:6].upper()}"


@router.get("", response_model=List[DeviceResponse])
def list_devices(
    search: Optional[str] = Query(None, description="Search by name, ID, IP or type"),
    status: Optional[str] = Query(None, description="Filter by status (online, offline, suspicious, isolated)"),
    risk_level: Optional[str] = Query(None, description="Filter by risk (low, medium, high, critical)"),
    segment: Optional[str] = Query(None, description="Filter by VLAN segment"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    """Retrieve filtered and paginated IoMT device inventory."""
    query = db.query(DeviceModel)

    if search:
        s = f"%{search}%"
        query = query.filter(
            or_(
                DeviceModel.name.ilike(s),
                DeviceModel.id.ilike(s),
                DeviceModel.ip_address.ilike(s),
                DeviceModel.device_type.ilike(s)
            )
        )
    if status:
        query = query.filter(DeviceModel.status == status)
    if risk_level:
        query = query.filter(DeviceModel.risk_level == risk_level)
    if segment:
        query = query.filter(DeviceModel.network_segment == segment)

    return query.offset(skip).limit(limit).all()


@router.post("", response_model=DeviceResponse, status_code=status.HTTP_201_CREATED)
def create_device(
    payload: DeviceCreate,
    db: Session = Depends(get_db),
    user: UserModel = Depends(require_analyst)
):
    """Register a new simulated IoMT device (Administrator or Security Analyst)."""
    data = payload.model_dump()
    device_id = (data.get("id") or "").strip()

    if device_id:
        existing = db.query(DeviceModel).filter(DeviceModel.id == device_id).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Device with ID {device_id} already exists."
            )
    else:
        device_id = _generate_device_id(db, data.get("device_type", ""))
    data["id"] = device_id

    # An IP address identifies exactly one asset on the network: two devices
    # sharing one address would break scope validation and telemetry mapping.
    duplicate_ip = (
        db.query(DeviceModel)
        .filter(DeviceModel.ip_address == data["ip_address"])
        .first()
    )
    if duplicate_ip:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                f"IP address {data['ip_address']} is already assigned to "
                f"{duplicate_ip.name} ({duplicate_ip.id})."
            ),
        )

    duplicate_mac = (
        db.query(DeviceModel)
        .filter(DeviceModel.mac_address == data["mac_address"])
        .first()
    )
    if duplicate_mac:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                f"MAC address {data['mac_address']} is already assigned to "
                f"{duplicate_mac.name} ({duplicate_mac.id})."
            ),
        )

    device = DeviceModel(**data)
    db.add(device)
    db.commit()
    db.refresh(device)

    # Record audit entry (chained automatically by the audit chain service)
    audit_chain_service.record_chained_log(
        db=db,
        actor=user.email,
        role=user.role,
        action="DEVICE_REGISTERED",
        entity_type="Device",
        entity_id=device.id,
        details=f"Registered device {device.name} ({device.device_type}) on segment {device.network_segment}.",
    )
    return device


@router.get("/{device_id}", response_model=DeviceResponse)
def get_device(
    device_id: str,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    """Retrieve detailed telemetry and metadata for a specific IoMT device."""
    device = db.query(DeviceModel).filter(DeviceModel.id == device_id).first()
    if not device:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Device {device_id} not found."
        )
    return device


@router.patch("/{device_id}", response_model=DeviceResponse)
def update_device(
    device_id: str,
    payload: DeviceUpdate,
    db: Session = Depends(get_db),
    user: UserModel = Depends(require_analyst)
):
    """Update device properties or quarantine/isolate network status (Security Analyst or Administrator)."""
    device = db.query(DeviceModel).filter(DeviceModel.id == device_id).first()
    if not device:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Device {device_id} not found."
        )

    update_data = payload.model_dump(exclude_unset=True)
    for field, val in update_data.items():
        setattr(device, field, val)

    device.updated_at = datetime.now(timezone.utc)

    audit = AuditLogModel(
        actor=user.email,
        role=user.role,
        action="DEVICE_UPDATED",
        entity_type="Device",
        entity_id=device.id,
        details=f"Updated fields: {list(update_data.keys())}.",
        status="success"
    )
    db.add(audit)
    db.commit()
    db.refresh(device)
    return device


@router.delete("/{device_id}", status_code=status.HTTP_204_NO_CONTENT)
def decommission_device(
    device_id: str,
    db: Session = Depends(get_db),
    user: UserModel = Depends(require_admin)
):
    """Decommission (delete) an IoMT asset from the inventory (Administrator only).

    An asset cannot be removed while an assessment against it is still QUEUED or
    RUNNING, because a live scan needs its inventoried target. Completed
    assessment history for the asset is removed with it, so the dashboard totals
    never count findings for a device that is no longer registered.
    """
    device = db.query(DeviceModel).filter(DeviceModel.id == device_id).first()
    if not device:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Device {device_id} not found."
        )

    active_assessments = (
        db.query(AssessmentModel)
        .filter(
            AssessmentModel.device_id == device_id,
            AssessmentModel.status.in_(["QUEUED", "RUNNING"])
        )
        .count()
    )
    if active_assessments:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                f"Device {device_id} has {active_assessments} assessment(s) still "
                "queued or running. Cancel them before decommissioning the asset."
            )
        )

    assessment_ids = [
        row[0]
        for row in db.query(AssessmentModel.id)
        .filter(AssessmentModel.device_id == device_id)
        .all()
    ]
    removed_summary = {
        "findings": 0,
        "reports": 0,
        "assessments": len(assessment_ids),
        "scopes": 0,
    }

    if assessment_ids:
        removed_summary["findings"] = (
            db.query(FindingModel)
            .filter(FindingModel.assessment_id.in_(assessment_ids))
            .delete(synchronize_session=False)
        )
        removed_summary["reports"] = (
            db.query(ReportModel)
            .filter(ReportModel.assessment_id.in_(assessment_ids))
            .delete(synchronize_session=False)
        )
        db.query(AssessmentModel).filter(
            AssessmentModel.id.in_(assessment_ids)
        ).delete(synchronize_session=False)

    # Findings recorded directly against the device (outside an assessment)
    removed_summary["findings"] += (
        db.query(FindingModel)
        .filter(FindingModel.device_id == device_id)
        .delete(synchronize_session=False)
    )
    removed_summary["scopes"] = (
        db.query(AssessmentScopeModel)
        .filter(AssessmentScopeModel.device_id == device_id)
        .delete(synchronize_session=False)
    )

    device_name = device.name
    db.delete(device)
    db.commit()

    audit_chain_service.record_chained_log(
        db=db,
        actor=user.email,
        role=user.role,
        action="DEVICE_DECOMMISSIONED",
        entity_type="Device",
        entity_id=device_id,
        details=(
            f"Removed device {device_name} ({device_id}) from inventory. "
            f"Deleted {removed_summary['assessments']} assessment(s), "
            f"{removed_summary['findings']} finding(s), "
            f"{removed_summary['reports']} report(s) and "
            f"{removed_summary['scopes']} scope certificate(s)."
        ),
    )
    return None
