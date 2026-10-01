"""Cryptographic Integrity Verification & AES-256-GCM Demonstration Endpoints."""

from typing import List
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.models.db_models import IntegrityRecordModel, AuditLogModel, UserModel
from app.schemas.integrity import (
    IntegrityVerifyRequest,
    IntegrityVerifyResponse,
    IntegrityTamperRequest,
    IntegrityRecordResponse
)
from app.services.crypto_service import crypto_service
from app.middleware.rbac import get_current_user, require_analyst

router = APIRouter(prefix="/integrity", tags=["Privacy and Integrity"])


@router.get("/results", response_model=List[IntegrityRecordResponse])
def get_integrity_records(
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    """List synthetic medical records and their cryptographic SHA-256 verification state."""
    return db.query(IntegrityRecordModel).all()


@router.post("/verify", response_model=IntegrityVerifyResponse)
def verify_record_integrity(
    payload: IntegrityVerifyRequest,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    """
    Computes real-time SHA-256 digest of record payload and compares against stored hash.
    Records verification outcome in audit trail.
    """
    rec = db.query(IntegrityRecordModel).filter(IntegrityRecordModel.record_id == payload.record_id).first()
    if not rec:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Integrity record {payload.record_id} not found."
        )

    computed_hash = crypto_service.compute_sha256(rec.raw_payload)
    is_match = crypto_service.verify_sha256(rec.raw_payload, rec.sha256_hash)

    rec.last_verified = datetime.now(timezone.utc)
    rec.status = "VERIFIED" if is_match else "TAMPERED"

    # Audit verification
    audit = AuditLogModel(
        actor=current_user.email,
        role=current_user.role,
        action="INTEGRITY_VERIFICATION",
        entity_type="IntegrityRecord",
        entity_id=rec.record_id,
        details=f"Verification result: {rec.status}. Match: {is_match}.",
        status="success" if is_match else "failed"
    )
    db.add(audit)
    db.commit()

    return IntegrityVerifyResponse(
        record_id=rec.record_id,
        status=rec.status,
        expected_hash=rec.sha256_hash,
        computed_hash=computed_hash,
        is_match=is_match,
        verified_at=rec.last_verified,
        message="Cryptographic integrity confirmed. Record matches stored SHA-256 digest."
        if is_match else "INTEGRITY MISMATCH DETECTED: Computed digest differs from stored digest. Record has been altered!"
    )


@router.post("/tamper-demo", response_model=IntegrityRecordResponse)
def simulate_tampering(
    payload: IntegrityTamperRequest,
    db: Session = Depends(get_db),
    analyst_user: UserModel = Depends(require_analyst)
):
    """
    Controlled demonstration modifying a synthetic patient telemetry field to test tamper detection.
    (Security Analyst or Admin only).
    """
    rec = db.query(IntegrityRecordModel).filter(IntegrityRecordModel.record_id == payload.record_id).first()
    if not rec:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Integrity record {payload.record_id} not found."
        )

    # Deliberately modify record payload to demonstrate mismatch
    tampered_payload = rec.raw_payload.replace("BPM: 72", "BPM: 140 [TAMPERED]")
    if tampered_payload == rec.raw_payload:
        tampered_payload += " [UNAUTHORIZED_BYTE_INJECTION]"

    rec.raw_payload = tampered_payload
    rec.status = "TAMPERED"
    rec.last_verified = datetime.now(timezone.utc)

    audit = AuditLogModel(
        actor=analyst_user.email,
        role=analyst_user.role,
        action="TAMPER_SIMULATION",
        entity_type="IntegrityRecord",
        entity_id=rec.record_id,
        details=f"Controlled payload mutation simulated on {rec.record_id}.",
        status="success"
    )
    db.add(audit)
    db.commit()
    db.refresh(rec)
    return rec
