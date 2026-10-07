"""Assessment Scope Authorization & Defensive Security Run Endpoints."""

import uuid
import json
from datetime import datetime, timezone, timedelta
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.models.db_models import (
    UserModel,
    DeviceModel,
    AssessmentScopeModel,
    AssessmentModel,
    FindingModel,
    AuditLogModel
)
from app.schemas.assessment import (
    ScopeCreateRequest,
    ScopeResponse,
    AssessmentLaunchRequest,
    AssessmentResponse,
    FindingResponse
)
from app.middleware.rbac import get_current_user, require_analyst, require_admin
from app.services.scope_validator import scope_validator

assessments_router = APIRouter(prefix="/api/assessments", tags=["Defensive Security Assessments"])


@assessments_router.post(
    "/authorize-scope",
    response_model=ScopeResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Authorize Assessment Scope for Registered IoMT Device"
)
def authorize_assessment_scope(
    req: ScopeCreateRequest,
    db: Session = Depends(get_db),
    user: UserModel = Depends(require_analyst)
):
    """Creates a strictly bounded, audited scope certificate for a registered IoMT device."""
    # 1. Validate constraints
    device = scope_validator.validate_new_scope_request(
        db=db,
        device_id=req.device_id,
        target_ip=req.target_ip,
        assessment_profile=req.assessment_profile,
        selected_tools=req.selected_tools,
        initiating_user=user
    )

    now = datetime.now(timezone.utc)
    expires_at = now + timedelta(hours=req.duration_hours)

    scope_id = f"SCOPE-{str(uuid.uuid4())[:8].upper()}"
    new_scope = AssessmentScopeModel(
        id=scope_id,
        device_id=device.id,
        target_ip=device.ip_address,
        target_hostname=req.target_hostname or f"{device.id}.medishield.local",
        authorization_status="AUTHORIZED",
        authorized_scope=req.authorized_scope,
        assessment_profile=req.assessment_profile,
        selected_tools=req.selected_tools,
        initiating_user_id=user.id,
        initiating_user_email=user.email,
        justification=req.justification,
        created_at=now,
        expires_at=expires_at
    )
    db.add(new_scope)

    # Audit log entry
    audit = AuditLogModel(
        id=str(uuid.uuid4()),
        actor=user.email,
        role=user.role,
        action="ASSESSMENT_SCOPE_AUTHORIZED",
        entity_type="AssessmentScope",
        entity_id=scope_id,
        ip_address="127.0.0.1",
        details=json.dumps({
            "device_id": device.id,
            "target_ip": device.ip_address,
            "profile": req.assessment_profile,
            "tools": req.selected_tools,
            "expires_at": expires_at.isoformat(),
            "justification": req.justification
        })
    )
    db.add(audit)
    db.commit()
    db.refresh(new_scope)
    return new_scope


@assessments_router.get(
    "/scopes",
    response_model=List[ScopeResponse],
    summary="List Assessment Scopes"
)
def list_assessment_scopes(
    device_id: Optional[str] = Query(None, description="Filter by device ID"),
    db: Session = Depends(get_db),
    user: UserModel = Depends(get_current_user)
):
    """Returns active and past authorized assessment scopes."""
    query = db.query(AssessmentScopeModel)
    if device_id:
        query = query.filter(AssessmentScopeModel.device_id == device_id)
    scopes = query.order_by(AssessmentScopeModel.created_at.desc()).all()

    # Update expired scopes in memory/db
    now = datetime.now(timezone.utc)
    for s in scopes:
        exp = s.expires_at.replace(tzinfo=timezone.utc) if s.expires_at.tzinfo is None else s.expires_at
        if s.authorization_status == "AUTHORIZED" and now > exp:
            s.authorization_status = "EXPIRED"
    db.commit()

    return scopes


@assessments_router.get(
    "/scopes/{scope_id}",
    response_model=ScopeResponse,
    summary="Get Assessment Scope Details"
)
def get_scope_details(
    scope_id: str,
    db: Session = Depends(get_db),
    user: UserModel = Depends(get_current_user)
):
    scope = db.query(AssessmentScopeModel).filter(AssessmentScopeModel.id == scope_id).first()
    if not scope:
        raise HTTPException(status_code=404, detail="Scope not found")
    return scope


@assessments_router.post(
    "/scopes/{scope_id}/revoke",
    response_model=ScopeResponse,
    summary="Revoke an Assessment Scope"
)
def revoke_assessment_scope(
    scope_id: str,
    db: Session = Depends(get_db),
    user: UserModel = Depends(require_analyst)
):
    scope = db.query(AssessmentScopeModel).filter(AssessmentScopeModel.id == scope_id).first()
    if not scope:
        raise HTTPException(status_code=404, detail="Scope not found")

    if scope.authorization_status == "REVOKED":
        return scope

    scope.authorization_status = "REVOKED"
    scope.revoked_at = datetime.now(timezone.utc)
    scope.revoked_by = user.email

    audit = AuditLogModel(
        id=str(uuid.uuid4()),
        actor=user.email,
        role=user.role,
        action="ASSESSMENT_SCOPE_REVOKED",
        entity_type="AssessmentScope",
        entity_id=scope_id,
        ip_address="127.0.0.1",
        details=json.dumps({"revoked_by": user.email, "device_id": scope.device_id})
    )
    db.add(audit)
    db.commit()
    db.refresh(scope)
    return scope


@assessments_router.get(
    "/tools/inventory",
    summary="Get Operational Status of Defensive Security Tools"
)
def get_tools_inventory(
    user: UserModel = Depends(get_current_user)
):
    """Returns detected status and configuration of defensive assessment tools."""
    from app.services.scanners.orchestrator import orchestrator
    return orchestrator.get_tool_inventory()


@assessments_router.post(
    "/execute",
    response_model=AssessmentResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Execute Authorized Defensive Assessment"
)
def execute_defensive_assessment(
    req: AssessmentLaunchRequest,
    db: Session = Depends(get_db),
    user: UserModel = Depends(require_analyst)
):
    """Executes authorized defensive assessment using approved tools within scope."""
    from app.services.scanners.orchestrator import orchestrator
    asm = orchestrator.execute_assessment(
        db=db,
        scope_id=req.scope_id,
        device_id=req.device_id,
        profile=req.profile,
        tools=req.tools,
        user=user
    )
    findings = db.query(FindingModel).filter(FindingModel.assessment_id == asm.id).all()
    res = AssessmentResponse.model_validate(asm)
    res.findings = [FindingResponse.model_validate(f) for f in findings]
    return res


@assessments_router.get(
    "",
    response_model=List[AssessmentResponse],
    summary="List Assessments"
)
def list_assessments(
    device_id: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    user: UserModel = Depends(get_current_user)
):
    query = db.query(AssessmentModel)
    if device_id:
        query = query.filter(AssessmentModel.device_id == device_id)
    return query.order_by(AssessmentModel.created_at.desc()).all()


@assessments_router.get(
    "/{assessment_id}",
    response_model=AssessmentResponse,
    summary="Get Assessment by ID"
)
def get_assessment(
    assessment_id: str,
    db: Session = Depends(get_db),
    user: UserModel = Depends(get_current_user)
):
    asm = db.query(AssessmentModel).filter(AssessmentModel.id == assessment_id).first()
    if not asm:
        raise HTTPException(status_code=404, detail="Assessment not found")

    findings = db.query(FindingModel).filter(FindingModel.assessment_id == assessment_id).all()
    res = AssessmentResponse.model_validate(asm)
    res.findings = [FindingResponse.model_validate(f) for f in findings]
    return res

