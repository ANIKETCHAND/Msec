-- =============================================================================
-- MediShield: IoMT Security & Privacy Platform
-- PostgreSQL / Supabase Relational Schema Definition
-- =============================================================================

-- Enable UUID extension if supported
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- -----------------------------------------------------------------------------
-- 1. Users & RBAC Roles
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('Administrator', 'Security Analyst', 'Doctor Demo')),
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    last_login TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- -----------------------------------------------------------------------------
-- 2. Simulated IoMT Devices
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS devices (
    id VARCHAR(50) PRIMARY KEY, -- e.g. DEV-ECG-001
    name VARCHAR(255) NOT NULL,
    device_type VARCHAR(100) NOT NULL, -- e.g. ECG Monitor, Infusion Pump, Wearable Sensor
    ip_address VARCHAR(45) NOT NULL,
    mac_address VARCHAR(17) NOT NULL,
    firmware_version VARCHAR(50) NOT NULL,
    network_segment VARCHAR(100) NOT NULL, -- e.g. ICU_VLAN_10, WARD_VLAN_20
    status VARCHAR(50) DEFAULT 'online' NOT NULL CHECK (status IN ('online', 'offline', 'suspicious', 'isolated')),
    risk_level VARCHAR(50) DEFAULT 'low' NOT NULL CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
    last_seen TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_devices_status ON devices(status);
CREATE INDEX IF NOT EXISTS idx_devices_risk ON devices(risk_level);
CREATE INDEX IF NOT EXISTS idx_devices_type ON devices(device_type);

-- -----------------------------------------------------------------------------
-- 3. Synthetic Telemetry Logs
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS telemetry (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    device_id VARCHAR(50) REFERENCES devices(id) ON DELETE CASCADE NOT NULL,
    metrics JSONB NOT NULL, -- e.g. {"heart_rate": 75, "spo2": 98, "systolic_bp": 120}
    network_stats JSONB NOT NULL, -- e.g. {"packet_count": 120, "byte_rate": 1024, "failed_auth": 0}
    is_anomaly BOOLEAN DEFAULT FALSE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_telemetry_device_time ON telemetry(device_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_telemetry_anomaly ON telemetry(is_anomaly);

-- -----------------------------------------------------------------------------
-- 4. Rule-Based & ML Security Events
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS security_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type VARCHAR(100) NOT NULL, -- e.g. AUTH_FAILURE_SPIKE, TRAFFIC_ANOMALY, UNKNOWN_DEVICE
    severity VARCHAR(50) NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    status VARCHAR(50) DEFAULT 'open' NOT NULL CHECK (status IN ('open', 'investigating', 'resolved', 'closed')),
    source_type VARCHAR(50) DEFAULT 'rule_engine' NOT NULL CHECK (source_type IN ('rule_engine', 'ml_model', 'simulation')),
    rule_id VARCHAR(100), -- e.g. RULE-AUTH-002
    device_id VARCHAR(50) REFERENCES devices(id) ON DELETE SET NULL,
    evidence JSONB DEFAULT '{}'::jsonb NOT NULL,
    investigation_steps TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    resolved_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_events_severity ON security_events(severity);
CREATE INDEX IF NOT EXISTS idx_events_status ON security_events(status);
CREATE INDEX IF NOT EXISTS idx_events_device ON security_events(device_id);
CREATE INDEX IF NOT EXISTS idx_events_created ON security_events(created_at DESC);

-- -----------------------------------------------------------------------------
-- 5. Incidents
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS incidents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    severity VARCHAR(50) NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    status VARCHAR(50) DEFAULT 'new' NOT NULL CHECK (status IN ('new', 'investigating', 'resolved', 'closed')),
    assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
    device_id VARCHAR(50) REFERENCES devices(id) ON DELETE SET NULL,
    investigation_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    resolved_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_incidents_status ON incidents(status);
CREATE INDEX IF NOT EXISTS idx_incidents_assigned ON incidents(assigned_to);

-- -----------------------------------------------------------------------------
-- 6. Cryptographic Integrity Records (SHA-256)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS integrity_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    record_identifier VARCHAR(100) NOT NULL,
    record_type VARCHAR(50) NOT NULL, -- e.g. telemetry, device_config, export_report
    algorithm VARCHAR(20) DEFAULT 'SHA-256' NOT NULL,
    stored_hash VARCHAR(64) NOT NULL, -- 64 hex characters for SHA-256
    verification_status VARCHAR(50) DEFAULT 'VERIFIED' NOT NULL CHECK (verification_status IN ('VERIFIED', 'TAMPERED', 'UNCHECKED')),
    last_verified_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_integrity_record_id ON integrity_records(record_identifier);

-- -----------------------------------------------------------------------------
-- 7. Audit Trail Logs (Immutable append-only)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    user_email VARCHAR(255),
    action VARCHAR(100) NOT NULL, -- e.g. LOGIN, DEVICE_REGISTER, INCIDENT_UPDATE, SIMULATION_TRIGGER
    entity_type VARCHAR(100) NOT NULL,
    entity_id VARCHAR(100),
    details JSONB DEFAULT '{}'::jsonb NOT NULL,
    ip_address VARCHAR(45),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_logs(action);
