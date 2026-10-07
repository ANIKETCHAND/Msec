"""SQLAlchemy Database Models for MediShield."""

import uuid
from datetime import datetime, timezone
from sqlalchemy import (
    Column,
    String,
    Boolean,
    DateTime,
    Text,
    Float,
    ForeignKey,
    JSON,
)
from sqlalchemy.orm import relationship
from app.database.session import Base


def utc_now():
    return datetime.now(timezone.utc)


class UserModel(Base):
    __tablename__ = "users"

    id = Column(String(50), primary_key=True, default=lambda: str(uuid.uuid4()))
    email = Column(String(255), unique=True, nullable=False, index=True)
    full_name = Column(String(255), nullable=False)
    role = Column(String(50), nullable=False, index=True)  # Administrator, Security Analyst, Doctor Demo
    is_active = Column(Boolean, default=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    last_login = Column(DateTime(timezone=True), nullable=True)


class DeviceModel(Base):
    __tablename__ = "devices"

    id = Column(String(50), primary_key=True)  # e.g. DEV-ECG-001
    name = Column(String(255), nullable=False)
    device_type = Column(String(100), nullable=False, index=True)
    ip_address = Column(String(45), nullable=False)
    mac_address = Column(String(17), nullable=False)
    firmware_version = Column(String(50), nullable=False)
    network_segment = Column(String(100), nullable=False)
    status = Column(String(50), default="online", nullable=False, index=True)  # online, offline, suspicious, isolated
    risk_level = Column(String(50), default="low", nullable=False, index=True)  # low, medium, high, critical
    manufacturer = Column(String(100), default="Generic Medical", nullable=True)
    model = Column(String(100), default="Standard Series", nullable=True)
    location = Column(String(100), default="Main Hospital Facility", nullable=True)
    department = Column(String(100), default="Clinical", nullable=True)
    owner = Column(String(100), default="Clinical Engineering", nullable=True)
    last_assessment = Column(DateTime(timezone=True), nullable=True)
    assessment_status = Column(String(50), default="NOT_ASSESSED", nullable=False)
    security_score = Column(Float, default=85.0, nullable=False)
    last_seen = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    meta_info = Column(JSON, default=dict)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)

    telemetry_logs = relationship("TelemetryModel", back_populates="device", cascade="all, delete-orphan")
    security_events = relationship("SecurityEventModel", back_populates="device")


class TelemetryModel(Base):
    __tablename__ = "telemetry"

    id = Column(String(50), primary_key=True, default=lambda: str(uuid.uuid4()))
    device_id = Column(String(50), ForeignKey("devices.id", ondelete="CASCADE"), nullable=False, index=True)
    metrics = Column(JSON, nullable=False)
    network_stats = Column(JSON, nullable=False)
    is_anomaly = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False, index=True)

    device = relationship("DeviceModel", back_populates="telemetry_logs")


class SecurityEventModel(Base):
    __tablename__ = "security_events"

    id = Column(String(50), primary_key=True, default=lambda: f"EVT-{uuid.uuid4().hex[:12]}")  # e.g. EVT-2026-001
    timestamp = Column(DateTime(timezone=True), default=utc_now, nullable=False, index=True)
    device_id = Column(String(50), ForeignKey("devices.id", ondelete="SET NULL"), nullable=True, index=True)
    event_type = Column(String(100), nullable=False, index=True)
    severity = Column(String(50), nullable=False, index=True)  # low, medium, high, critical
    rule_id = Column(String(50), nullable=False)
    rule_name = Column(String(255), nullable=False)
    evidence = Column(JSON, default=dict)
    suggested_action = Column(Text, nullable=True)
    status = Column(String(50), default="open", nullable=False, index=True)  # open, investigating, resolved, false_positive
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)

    device = relationship("DeviceModel", back_populates="security_events")


class IncidentModel(Base):
    __tablename__ = "incidents"

    id = Column(String(50), primary_key=True)  # e.g. INC-2026-001
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    severity = Column(String(50), nullable=False, index=True)
    status = Column(String(50), default="new", nullable=False, index=True)  # new, investigating, resolved, closed
    assigned_to = Column(String(255), nullable=True)
    device_id = Column(String(50), nullable=True)
    resolution_notes = Column(Text, nullable=True)
    notes = Column(JSON, default=list)  # list of {author, time, text}
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)


class AuditLogModel(Base):
    __tablename__ = "audit_logs"

    id = Column(String(50), primary_key=True, default=lambda: f"AUD-{uuid.uuid4().hex[:12]}")  # e.g. AUD-2026-001
    timestamp = Column(DateTime(timezone=True), default=utc_now, nullable=False, index=True)
    actor = Column(String(255), nullable=False)
    role = Column(String(50), nullable=False)
    action = Column(String(100), nullable=False, index=True)
    entity_type = Column(String(100), nullable=False)
    entity_id = Column(String(100), nullable=True)
    ip_address = Column(String(45), default="127.0.0.1", nullable=False)
    details = Column(Text, nullable=True)
    status = Column(String(50), default="success", nullable=False)


class IntegrityRecordModel(Base):
    __tablename__ = "integrity_records"

    id = Column(String(50), primary_key=True, default=lambda: str(uuid.uuid4()))
    record_id = Column(String(50), unique=True, nullable=False, index=True)
    entity_type = Column(String(100), nullable=False)
    raw_payload = Column(Text, nullable=False)
    encrypted_payload = Column(Text, nullable=True)  # AES-256-GCM ciphertext (hex)
    sha256_hash = Column(String(64), nullable=False)
    status = Column(String(50), default="VERIFIED", nullable=False)  # VERIFIED, TAMPERED
    last_verified = Column(DateTime(timezone=True), default=utc_now, nullable=False)


class ModelMetadataModel(Base):
    __tablename__ = "model_metadata"

    id = Column(String(50), primary_key=True, default=lambda: str(uuid.uuid4()))
    model_name = Column(String(100), nullable=False)
    version = Column(String(50), nullable=False)
    dataset_name = Column(String(100), nullable=False)
    accuracy = Column(Float, nullable=False)
    precision = Column(Float, nullable=False)
    recall = Column(Float, nullable=False)
    f1 = Column(Float, nullable=False)
    confusion_matrix = Column(JSON, default=dict)
    trained_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    status = Column(String(50), default="active", nullable=False)


class DetectionPolicyModel(Base):
    __tablename__ = "detection_policies"

    id = Column(String(50), primary_key=True, default="default")
    auth_failure_threshold = Column(Float, default=5.0, nullable=False)
    packet_rate_dos_threshold = Column(Float, default=600.0, nullable=False)
    syn_ratio_threshold = Column(Float, default=0.50, nullable=False)
    port_entropy_threshold = Column(Float, default=2.8, nullable=False)
    heartbeat_timeout_sec = Column(Float, default=180.0, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)
    updated_by = Column(String(255), default="system", nullable=False)

