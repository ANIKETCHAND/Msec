# MediShield — Complete REST API Documentation

This document describes all RESTful endpoints implemented in the MediShield FastAPI backend.

- **Base URL**: `http://127.0.0.1:8000/api`
- **Interactive OpenAPI Documentation**: `http://127.0.0.1:8000/docs`
- **Authentication**: Bearer Token in `Authorization: Bearer <token>` header.

---

## 1. Authentication & Session

### `POST /api/auth/login`
Authenticates a user and returns an HMAC-signed Bearer Token.
- **Request Body**:
  ```json
  {
    "email": "analyst@medishield.local",
    "password": "analystpassword123"
  }
  ```
- **Response (200 OK)**:
  ```json
  {
    "access_token": "eyJhbGciOiJIUzI1NiJ9...signature",
    "token_type": "bearer",
    "role": "Security Analyst",
    "email": "analyst@medishield.local",
    "name": "Sarah Chen"
  }
  ```

### `GET /api/auth/me`
Retrieves current user identity and claims.
- **Response (200 OK)**: User profile model.

### `POST /api/auth/logout`
Records sign-out event in immutable audit trail.

---

## 2. IoMT Device Inventory

### `GET /api/devices`
Lists devices with optional filtering and pagination.
- **Query Parameters**:
  - `search`: string filter on name, ID, or IP.
  - `status`: `online`, `offline`, `suspicious`, `isolated`.
  - `risk_level`: `low`, `medium`, `high`, `critical`.
  - `segment`: e.g. `ICU_VLAN_10`.
  - `skip`: pagination offset (default `0`).
  - `limit`: page size (default `50`).
- **Response (200 OK)**: Array of `DeviceResponse` objects.

### `POST /api/devices` (Administrator Only)
Registers a new medical device. Returns HTTP 403 Forbidden for non-administrators.

### `GET /api/devices/{device_id}`
Retrieves device details and current operating telemetry.

### `PATCH /api/devices/{device_id}` (Administrator Only)
Updates device status (e.g. quarantining an infected device to `isolated`).

---

## 3. Telemetry Stream

### `GET /api/telemetry`
Fetches recent telemetry packets. Query parameter `device_id` can filter by device.

### `POST /api/telemetry`
Ingests telemetry, evaluates against detection rules, and automatically creates a `SecurityEvent` if thresholds are exceeded.
- **Request Body**:
  ```json
  {
    "device_id": "DEV-VENT-502",
    "metrics": {"heart_rate": 78, "spo2": 99},
    "network_stats": {"failed_auth_count": 8, "packet_rate": 50, "source_ip": "192.168.10.198"},
    "is_anomaly": false
  }
  ```
- **Response (201 Created)**: Saved telemetry record with `is_anomaly: true`.

---

## 4. Security Events

### `GET /api/security-events`
Lists security alerts. Filterable by `severity`, `status`, `device_id`.

### `GET /api/security-events/{event_id}`
Returns event evidence payload, triggered rule details, and suggested actions.

### `PATCH /api/security-events/{event_id}` (Security Analyst or Admin)
Updates triage status (`open`, `investigating`, `resolved`, `false_positive`).

---

## 5. Incident Management

### `GET /api/incidents`
Lists security investigation tickets.

### `POST /api/incidents` (Security Analyst or Admin)
Opens a new investigation ticket linked to a security event.

### `PATCH /api/incidents/{incident_id}` (Security Analyst or Admin)
Transitions status (`new` $\to$ `investigating` $\to$ `resolved` $\to$ `closed`), assigns analysts, and appends timestamped notes.

---

## 6. Detection Engine & ML Inference

### `GET /api/detection/status`
Returns status of active rule heuristics and loaded CICIoMT2024 model metadata.

### `POST /api/detection/evaluate`
Evaluates flow characteristics against both rule engine and trained ML classifier.
- **Request Body**:
  ```json
  {
    "device_id": "DEV-VENT-502",
    "packet_rate": 1400.0,
    "packet_size": 64.0,
    "syn_ratio": 0.85,
    "port_entropy": 1.2,
    "failed_auth_count": 0
  }
  ```
- **Response (200 OK)**:
  ```json
  {
    "is_anomaly": true,
    "detection_type": "Rule-Based Security Violation",
    "rule_triggered": "RULE-NET-003: Unusual Simulated Traffic Volume Spike (Potential DoS)",
    "predicted_class": "DoS_SYN_Flood",
    "confidence": 0.942,
    "model_version": "1.0.0",
    "severity": "high",
    "suggested_action": "Throttle switch port on ICU VLAN 10.",
    "evaluated_at": "2026-10-01T18:50:00Z"
  }
  ```

---

## 7. Cryptographic Privacy & Data Integrity

### `GET /api/integrity/results`
Returns synthetic patient records, their AES-256-GCM encrypted payload, and stored SHA-256 digests.

### `POST /api/integrity/verify`
Computes SHA-256 digest of record payload and compares against stored digest in constant time.
- **Request Body**: `{"record_id": "REC-ICU-001"}`
- **Response (200 OK)**: Status `VERIFIED` or `TAMPERED`.

### `POST /api/integrity/tamper-demo` (Security Analyst or Admin)
Deliberately corrupts 1 byte of the synthetic payload to test tamper detection.

---

## 8. Audit Logs & Reports

### `GET /api/audit-logs` (Security Analyst or Admin)
Returns append-only audit trail entries with filters on `action` and `actor`.

### `GET /api/reports/summary` (Security Analyst or Admin)
Aggregated statistics for SOC dashboards.

### `GET /api/reports/security-events.csv` (Security Analyst or Admin)
Streams real-time CSV generated from actual stored database security events.

### `GET /api/reports/incidents.csv` (Security Analyst or Admin)
Streams real-time CSV generated from actual stored database incident records.

---

## 9. Simulation Controls

### `POST /api/simulation/scenarios/{scenario_name}`
Triggers safe synthetic anomalies: `auth_spike`, `traffic_spike`, `device_offline`, `unknown_device`, `normal`.

### `POST /api/simulation/reset`
Restores clean baseline state.
