"""Cryptographic SHA-256 Audit Hash Chain Service for Tamper-Evident Logging.

Every audit entry is linked to its predecessor:

    entry.prev_hash = previous entry's entry_hash
    entry.entry_hash = SHA256(prev_hash | timestamp | actor | action | entity_type | entity_id | details)

Chaining happens automatically for *any* ``AuditLogModel`` insert through a
``before_flush`` session hook, so every write path is covered regardless of which
endpoint created the record. ``verify_chain`` recomputes every digest, so a
mutated field, a missing digest or a removed/inserted record is reported as a
failure instead of being silently skipped.
"""

import hashlib
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Optional

from sqlalchemy import event
from sqlalchemy.orm import Session

from app.models.db_models import AuditLogModel


GENESIS_PREV_HASH = "0" * 64


def _as_utc(value: Optional[datetime]) -> datetime:
    """Normalise a datetime to timezone-aware UTC (SQLite returns naive values)."""
    if value is None:
        return datetime.now(timezone.utc)
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def canonical_timestamp(value: Optional[datetime]) -> str:
    """Stable, round-trip-safe timestamp representation used inside the digest."""
    return _as_utc(value).strftime("%Y-%m-%dT%H:%M:%S.%f")


class AuditChainService:
    """Manages cryptographic SHA-256 chaining of MediShield audit trail entries."""

    # ------------------------------------------------------------------ hashing
    @staticmethod
    def compute_hash(
        prev_hash: str,
        timestamp_str: str,
        actor: str,
        action: str,
        entity_type: str,
        entity_id: Optional[str],
        details: Optional[str],
    ) -> str:
        payload = "|".join(
            [
                prev_hash or "",
                timestamp_str or "",
                actor or "",
                action or "",
                entity_type or "",
                entity_id or "",
                details or "",
            ]
        )
        return hashlib.sha256(payload.encode("utf-8")).hexdigest()

    @classmethod
    def hash_entry(cls, entry: AuditLogModel) -> str:
        """Recompute the digest of a persisted entry from its current field values."""
        return cls.compute_hash(
            prev_hash=entry.prev_hash,
            timestamp_str=canonical_timestamp(entry.timestamp),
            actor=entry.actor,
            action=entry.action,
            entity_type=entry.entity_type,
            entity_id=entry.entity_id,
            details=entry.details,
        )

    # ------------------------------------------------------------------- chain
    @staticmethod
    def _chain_head(db: Session):
        """Return (head_hash, head_timestamp) of the newest chained record."""
        latest = (
            db.query(AuditLogModel)
            .filter(AuditLogModel.entry_hash.isnot(None))
            .order_by(AuditLogModel.timestamp.desc(), AuditLogModel.id.desc())
            .first()
        )
        if latest is None:
            return GENESIS_PREV_HASH, None
        return latest.entry_hash, _as_utc(latest.timestamp)

    @classmethod
    def ensure_chain(cls, db: Session) -> int:
        """Seal audit records that predate hash chaining.

        Everything from the first unsigned record onward is (re)sealed in
        ``(timestamp, id)`` order, so a partially migrated log becomes one
        continuous chain. A log in which every record is already signed is left
        untouched -- verification, not repair, is then the source of truth, so a
        genuine tamper is still detected instead of silently re-sealed.
        """
        entries = (
            db.query(AuditLogModel)
            .order_by(AuditLogModel.timestamp.asc(), AuditLogModel.id.asc())
            .all()
        )
        if not entries:
            return 0

        first_unsigned = next(
            (i for i, entry in enumerate(entries) if not entry.entry_hash), None
        )
        if first_unsigned is None:
            return 0

        head = GENESIS_PREV_HASH
        previous_ts: Optional[datetime] = None

        if first_unsigned > 0:
            anchor = entries[first_unsigned - 1]
            head = anchor.entry_hash
            previous_ts = _as_utc(anchor.timestamp)

        sealed = 0
        for entry in entries[first_unsigned:]:
            timestamp = _as_utc(entry.timestamp)
            if previous_ts is not None and timestamp <= previous_ts:
                timestamp = previous_ts + timedelta(microseconds=1)
            entry.timestamp = timestamp
            previous_ts = timestamp

            entry.prev_hash = head
            entry.entry_hash = cls.hash_entry(entry)
            head = entry.entry_hash
            sealed += 1

        db.commit()
        return sealed

    @classmethod
    def verify_chain(cls, db: Session) -> Dict[str, Any]:
        """Validate the chain end to end, recomputing every digest."""
        entries = (
            db.query(AuditLogModel)
            .order_by(AuditLogModel.timestamp.asc(), AuditLogModel.id.asc())
            .all()
        )
        total = len(entries)

        if not entries:
            return {
                "chain_valid": True,
                "total_records": 0,
                "verified_records": 0,
                "genesis_prev_hash": GENESIS_PREV_HASH,
                "head_hash": None,
                "message": "Audit log is empty; there is no chain to verify.",
            }

        expected_prev = GENESIS_PREV_HASH
        verified = 0

        for entry in entries:
            if not entry.entry_hash:
                return cls._failure(
                    entries,
                    verified,
                    entry,
                    "Audit entry "
                    f"{entry.id} carries no SHA-256 digest and is not part of the chain.",
                )

            if entry.prev_hash != expected_prev:
                return cls._failure(
                    entries,
                    verified,
                    entry,
                    f"Chain link broken at {entry.id}: expected prev_hash "
                    f"{str(expected_prev)[:16]}..., found "
                    f"{str(entry.prev_hash)[:16]}...",
                )

            if cls.hash_entry(entry) != entry.entry_hash:
                return cls._failure(
                    entries,
                    verified,
                    entry,
                    f"Content digest mismatch at {entry.id}: stored hash does not match "
                    "the SHA-256 digest recomputed from the record fields.",
                )

            expected_prev = entry.entry_hash
            verified += 1

        return {
            "chain_valid": True,
            "total_records": total,
            "verified_records": verified,
            "genesis_prev_hash": GENESIS_PREV_HASH,
            "head_hash": entries[-1].entry_hash,
            "message": (
                f"Cryptographic integrity verified: all {verified} audit entries "
                "recompute to their stored SHA-256 digest and link to a single chain."
            ),
        }

    @staticmethod
    def _failure(entries, verified: int, entry: AuditLogModel, error: str) -> Dict[str, Any]:
        return {
            "chain_valid": False,
            "total_records": len(entries),
            "verified_records": verified,
            "tampered_record_id": entry.id,
            "genesis_prev_hash": GENESIS_PREV_HASH,
            "head_hash": None,
            "error": error,
            "message": error,
        }

    # --------------------------------------------------------------- write path
    @classmethod
    def record_chained_log(
        cls,
        db: Session,
        actor: str,
        role: str,
        action: str,
        entity_type: str,
        entity_id: Optional[str] = None,
        details: Optional[str] = None,
        ip_address: str = "127.0.0.1",
        status_value: str = "success",
    ) -> AuditLogModel:
        """Append a chained audit entry (hash filled in by the flush hook)."""
        entry = AuditLogModel(
            id=f"AUD-{uuid.uuid4().hex[:12]}",
            timestamp=datetime.now(timezone.utc),
            actor=actor,
            role=role,
            action=action,
            entity_type=entity_type,
            entity_id=entity_id,
            ip_address=ip_address,
            details=details,
            status=status_value,
        )
        db.add(entry)
        db.commit()
        db.refresh(entry)
        return entry


def _seal_pending_entries(session: Session) -> None:
    """Chain every pending AuditLogModel in write order with strictly increasing timestamps."""
    pending = [obj for obj in session.new if isinstance(obj, AuditLogModel)]
    if not pending:
        return

    try:
        with session.no_autoflush:
            head, previous_ts = AuditChainService._chain_head(session)
    except Exception:
        # Schema not created yet (initial seeding) -- start a fresh chain.
        head, previous_ts = GENESIS_PREV_HASH, None

    for entry in pending:
        if entry.entry_hash:
            head = entry.entry_hash
            previous_ts = _as_utc(entry.timestamp)
            continue

        timestamp = _as_utc(entry.timestamp)
        if previous_ts is not None and timestamp <= previous_ts:
            timestamp = previous_ts + timedelta(microseconds=1)
        entry.timestamp = timestamp
        previous_ts = timestamp

        entry.prev_hash = head
        entry.entry_hash = AuditChainService.hash_entry(entry)
        head = entry.entry_hash


@event.listens_for(Session, "before_flush")
def _chain_audit_entries_on_flush(session, flush_context, instances):
    _seal_pending_entries(session)


audit_chain_service = AuditChainService()
