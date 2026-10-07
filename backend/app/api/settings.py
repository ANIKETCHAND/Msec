"""System Settings & Detection Policy API Endpoints."""

from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.models.db_models import DetectionPolicyModel, AuditLogModel, UserModel
from app.schemas.settings import PolicyUpdateRequest, PolicyResponse
from app.services.detection_engine import detection_engine
from app.middleware.rbac import get_current_user, require_admin

router = APIRouter(prefix="/settings", tags=["Settings"])


@router.get("/policies", response_model=PolicyResponse)
def get_policies(
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    """Retrieve current intrusion detection policy thresholds."""
    policy = db.query(DetectionPolicyModel).filter(DetectionPolicyModel.id == "default").first()
    if not policy:
        # Initialize default row from engine
        th = detection_engine.get_thresholds()
        policy = DetectionPolicyModel(
            id="default",
            auth_failure_threshold=th["auth_failure_threshold"],
            packet_rate_dos_threshold=th["packet_rate_dos_threshold"],
            syn_ratio_threshold=th["syn_ratio_threshold"],
            port_entropy_threshold=th["port_entropy_threshold"],
            heartbeat_timeout_sec=th["heartbeat_timeout_sec"],
            updated_at=datetime.now(timezone.utc),
            updated_by="system"
        )
        db.add(policy)
        db.commit()
        db.refresh(policy)
    return policy


@router.put("/policies", response_model=PolicyResponse)
def update_policies(
    payload: PolicyUpdateRequest,
    db: Session = Depends(get_db),
    admin_user: UserModel = Depends(require_admin)
):
    """Update and persist intrusion detection rule thresholds (Administrator only)."""
    policy = db.query(DetectionPolicyModel).filter(DetectionPolicyModel.id == "default").first()
    if not policy:
        policy = DetectionPolicyModel(id="default")
        db.add(policy)

    update_dict = payload.model_dump(exclude_unset=True)
    for field, val in update_dict.items():
        if val is not None:
            setattr(policy, field, val)

    policy.updated_at = datetime.now(timezone.utc)
    policy.updated_by = admin_user.email

    # Synchronize in-memory engine immediately
    detection_engine.update_thresholds(**update_dict)

    # Log action to immutable audit trail
    audit = AuditLogModel(
        actor=admin_user.email,
        role=admin_user.role,
        action="DETECTION_POLICIES_UPDATED",
        entity_type="DetectionPolicy",
        entity_id="default",
        details=f"Updated thresholds: {update_dict}",
        status="success"
    )
    db.add(audit)
    db.commit()
    db.refresh(policy)
    return policy
