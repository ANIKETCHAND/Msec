# MediShield — Proposed System Architecture

## 1. Executive Overview

MediShield is an academic IoMT (Internet of Medical Things) cybersecurity and privacy research prototype. It provides real-time security monitoring, deterministic rule-based intrusion detection, genuine machine learning attack classification, authenticated encryption (AES-GCM), cryptographic data integrity verification (SHA-256), and incident investigation management.

```mermaid
flowchart TD
    subgraph Client ["Client Tier (Browser)"]
        UI["React 18 + Vite SPA"]
        State["Client State & Route Guards"]
    end

    subgraph Gateway ["Application Gateway & API Tier"]
        FastAPI["FastAPI 0.110+ (Asynchronous ASGI)"]
        CORS["Strict CORS Middleware"]
        AuthMid["RBAC & Session Middleware"]
        RuleEng["Rule-Based Detection Engine"]
        Crypto["AES-GCM & SHA-256 Crypto Engine"]
    end

    subgraph DataTier ["Persistence & Analytics Tier"]
        DB[(PostgreSQL / Supabase)]
        ML["CICIoMT2024 ML Inference (Random Forest)"]
    end

    UI <-->|HTTPS / REST / JSON| FastAPI
    FastAPI --> CORS
    CORS --> AuthMid
    AuthMid --> RuleEng
    AuthMid --> Crypto
    FastAPI <-->|SQL Queries / ORM| DB
    FastAPI <-->|In-Memory Inference / Joblib| ML
```

---

## 2. Component Responsibilities

### 2.1 Frontend Tier (`/frontend`)
- **Technology**: React 18, Vite, Tailwind CSS, Recharts, Lucide React.
- **Responsibilities**:
  - Render an intuitive medical cybersecurity dashboard (dark navy palette with clinical status accents).
  - Visualize simulated IoMT telemetry (heart rate, glucose, SPO2, infusion rates) and network metrics.
  - Present security events, rule violations, and incident response queues.
  - Provide interactive safe simulation controls to trigger security anomalies for academic demonstration.
  - Display ML model performance metrics, dataset provenance, and honest confusion matrices without exaggeration.
  - Enforce visual role-based UI access based on server-verified session claims.

### 2.2 Backend API Tier (`/backend`)
- **Technology**: Python 3.11, FastAPI, Pydantic v2, Uvicorn.
- **Responsibilities**:
  - Deliver structured, asynchronous RESTful endpoints under `/api`.
  - Validate all input payloads strictly with Pydantic v2 schemas.
  - Server-side Role-Based Access Control (RBAC) across three distinct personas:
    1. **Administrator**: Full device inventory, user configuration, audit log inspection.
    2. **Security Analyst**: Security event inspection, incident triage, ML evaluation, report exports.
    3. **Doctor Demo Role**: Restricted synthetic patient/device telemetry view; no security admin access.
  - Execute deterministic detection rules across synthetic device telemetry streams.
  - Interface with the machine learning pipeline for IoMT attack classification.
  - Provide authenticated encryption (AES-256-GCM) and integrity computation (SHA-256) services.
  - Maintain immutable audit log trails for sensitive actions and administrative changes.

### 2.3 Database & Storage Tier (`/database`)
- **Technology**: PostgreSQL (managed via Supabase).
- **Responsibilities**:
  - Relational persistence of simulated medical devices, device telemetry, security events, incidents, integrity verification logs, audit logs, and user profiles.
  - Enforce foreign keys, unique constraints, check constraints, and indexing on lookup fields (e.g., `device_id`, `timestamp`, `severity`).
  - Maintain auditability by timestamping all state transitions.

### 2.4 Machine Learning Engine (`/ml`)
- **Technology**: scikit-learn, pandas, numpy, joblib.
- **Responsibilities**:
  - Ingest genuine IoMT network traffic data (using UNB's **CICIoMT2024** dataset).
  - Execute reproducible preprocessing: feature selection, handling missing values, encoding labels, and group-aware splitting to avoid cross-device data leakage.
  - Train an explainable classifier (Random Forest) and anomaly detector.
  - Output genuine, verifiable evaluation metrics (Precision, Recall, F1, Confusion Matrix).
  - Serve predictions to the backend inference service with model versioning, feature verification, and confidence scores.

### 2.5 Cryptographic & Privacy Subsystem
- **Technology**: Python `cryptography` library.
- **Responsibilities**:
  - Encrypt synthetic sensitive records using AES-GCM (Galois/Counter Mode) with unique 96-bit nonces per encryption operation.
  - Compute SHA-256 cryptographic digests for synthetic telemetry and exported reports to demonstrate tamper-detection.
  - Strictly isolate encryption keys in server-side environment variables (`.env`), never transmitting them to clients or storing them plaintext in databases.

---

## 3. Data Flow Architecture

### 3.1 Device Telemetry & Intrusion Detection Flow
```mermaid
sequenceDiagram
    autonumber
    actor Sim as Synthetic Device / Simulator
    participant API as FastAPI Backend
    participant Rule as Rule-Based Engine
    participant ML as ML Inference Engine
    participant DB as PostgreSQL
    participant Dashboard as React Dashboard

    Sim->>API: POST /api/telemetry (Synthetic Metrics)
    API->>API: Validate Pydantic Schema
    API->>Rule: Evaluate Telemetry Against Detection Rules
    alt Rule Violation Detected (e.g., Traffic Spike, Auth Failure)
        Rule->>DB: Record Security Event (Severity, Evidence)
    end
    API->>ML: Evaluate Flow Features (CICIoMT2024 Model)
    ML-->>API: ML Prediction & Confidence Score
    API->>DB: Persist Telemetry & ML Prediction Record
    Dashboard->>API: GET /api/security-events & GET /api/telemetry
    API-->>Dashboard: Return Real-time Verified Records
```

### 3.2 Data Integrity Verification & Tampering Demonstration
```mermaid
sequenceDiagram
    autonumber
    actor Analyst as Security Analyst
    participant API as FastAPI Backend
    participant Crypto as Crypto Engine
    participant DB as PostgreSQL

    Analyst->>API: POST /api/integrity/verify (record_id)
    API->>DB: Fetch Synthetic Record & Stored SHA-256 Digest
    API->>Crypto: Compute SHA-256 of Current Record Payload
    Crypto-->>API: Computed Hash
    API->>API: Compare Stored Hash vs Computed Hash
    alt Hashes Match
        API-->>Analyst: Status: VERIFIED (Record Intact)
    else Hash Mismatch
        API->>DB: Log Integrity Failure Alert in Audit Log
        API-->>Analyst: Status: TAMPERED (Mismatch Detected)
    end
```

---

## 4. Security Principles & Architecture Controls

1. **Defense in Depth**: Authorization checks are applied at the route handler level via FastAPI dependencies, never relying on UI visibility toggles.
2. **Deterministic vs. Probabilistic Clear Separation**:
   - Deterministic rule alerts (e.g., failed logins >= 5, unexpected offline) are labeled as **Security Events**.
   - Machine learning outputs are labeled as **ML Classifications with Confidence Scores**, acknowledging model error bounds.
3. **Auditability**: Every critical state transition (incident status, role change, key verification, scenario trigger) creates an append-only audit log entry.
4. **Zero Production Assumptions**: All medical data is explicitly generated synthetic test vectors; no actual clinical patient records or real devices are used.
