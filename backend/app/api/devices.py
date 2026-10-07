"""Device Inventory and Management API Endpoints."""

from typing import List, Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import or_
from app.database.session import get_db
from app.models.db_models import DeviceModel, AuditLogModel, UserModel
from app.schemas.device import DeviceCreate, DeviceUpdate, DeviceResponse
from app.middleware.rbac import get_current_user, require_admin, require_analyst

router = APIRouter(prefix="/devices", tags=["Devices"])


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
    admin_user: UserModel = Depends(require_admin)
):
    """Register a new simulated IoMT device (Administrator role only)."""
    existing = db.query(DeviceModel).filter(DeviceModel.id == payload.id).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Device with ID {payload.id} already exists."
        )

    device = DeviceModel(**payload.model_dump())
    db.add(device)

    # Record audit entry
    audit = AuditLogModel(
        actor=admin_user.email,
        role=admin_user.role,
        action="DEVICE_REGISTERED",
        entity_type="Device",
        entity_id=device.id,
        details=f"Registered device {device.name} ({device.device_type}) on segment {device.network_segment}.",
        status="success"
    )
    db.add(audit)
    db.commit()
    db.refresh(device)
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
