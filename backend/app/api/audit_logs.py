"""Audit Logs API Endpoints."""

from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.models.db_models import AuditLogModel, UserModel
from app.schemas.audit import AuditLogResponse
from app.middleware.rbac import require_analyst

router = APIRouter(prefix="/audit-logs", tags=["Audit Logs"])


@router.get("", response_model=List[AuditLogResponse])
def list_audit_logs(
    action: Optional[str] = Query(None, description="Filter by action code"),
    actor: Optional[str] = Query(None, description="Filter by user or service actor email"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    analyst_user: UserModel = Depends(require_analyst)
):
    """Retrieve immutable audit trail entries (Security Analyst and Administrator only)."""
    query = db.query(AuditLogModel)
    if action:
        query = query.filter(AuditLogModel.action == action)
    if actor:
        query = query.filter(AuditLogModel.actor.ilike(f"%{actor}%"))

    return query.order_by(AuditLogModel.timestamp.desc()).offset(skip).limit(limit).all()


@router.get("/verify-chain")
def verify_audit_hash_chain(
    db: Session = Depends(get_db),
    analyst_user: UserModel = Depends(require_analyst)
):
    """Cryptographically verifies the unbroken SHA-256 hash chain across audit trail entries."""
    from app.services.audit_chain_service import audit_chain_service
    return audit_chain_service.verify_chain(db)

