# MediShield — IoMT Security & Privacy Platform (v2.0)

> **Enterprise IoMT Cybersecurity Platform & Assessment Suite**  
> An integrated defensive security operations platform for the Internet of Medical Things (IoMT). Provides real-time asset posture monitoring, explainable rule-based intrusion detection, authorized vulnerability assessment orchestration (Nmap, Nuclei, ZAP, Nikto, OpenVAS), publication-grade ReportLab PDF & standalone Jinja2 HTML report generation with SHA-256 cryptographic seals, real-time security events triage with deep packet forensic evidence, and unbroken SHA-256 audit hash chaining.

---

## 1. Simplified Guided User Workflow

MediShield is refactored into a clear, single-threaded operational workflow tailored for clinical security analysts:

```text
LANDING PAGE
     │
     ▼
USER LOGIN (RBAC Authentication & Persona Presets)
     │
     ▼
SECURITY DASHBOARD (Authoritative Backend Metrics & "Start New Assessment" CTA)
     │
     ▼
ASSESSMENT CENTER (Primary Operational Workspace)
     │
     ▼
SELECT REGISTERED IoMT DEVICE & VERIFY DEFENSIVE SCOPE
     │
     ▼
CONFIGURE AND EXECUTE SECURITY SCAN (Multi-Tool Orchestration)
     │
     ▼
NORMALIZE FINDINGS AND CALCULATE CVSS RISK POSTURE
     │
     ▼
GENERATE CERTIFIED SECURITY REPORT (PDF via ReportLab / HTML via Jinja2)
     │
     ▼
SECURITY EVENTS (Two-Column Queue & Forensic Deep-Dive)
     │
     ▼
EVENT DESCRIPTION & EVIDENCE (Packet Payloads, Clinical Context, Triage Actions)
```

The user navigates directly through this cycle to audit clinical assets, inspect security findings, produce signed compliance reports, and triage real-time telemetry anomalies without friction.

---

## 2. User-Facing Navigation Structure

The simplified interface focuses strictly on operational workspaces:

- **Dashboard**: High-level SOC view with authoritative backend metrics (Monitored Devices, Completed Assessments, Critical Findings, High Findings, Open Events, Reports), posture score, and recent assessment executions.
- **Assessment Center**: Primary operational workspace for defensive scan authorization, tool configuration, execution progress, and normalized CVE findings.
- **Security Reports**: Archive of generated PDF and HTML reports with SHA-256 seal verification and direct downloads.
- **Security Events**: Two-column investigation workspace featuring an interactive event queue and a deep-dive event panel with raw packet payloads, clinical impact context, and triage actions.
- **Device Inventory**: Registry of clinical assets (6 seeded default demo assets across ICU, OR, and Ward VLANs) with IP, MAC, VLAN segment, status, and diagnostic drill-downs.
- **Security Tools**: Operational status of defensive engines (Nmap, Nuclei, OWASP ZAP, Nikto, OpenVAS, Suricata, TShark, Syft, Trivy, Lynis, Zeek).
- **Incident Management**: Investigation tracking for high-severity correlated clinical alerts and containment actions.
- **ML Detection**: Real-time intrusion detection and Random Forest inference evaluation on UNB CICIoMT2024 dataset.
- **Network Topology**: Interactive visualization of healthcare gateway and VLAN segments.
- **Response Simulator**: Safe sandbox for testing telemetry containment and simulated anomalies.
- **Audit Logs**: Cryptographic SHA-256 hash-chain ledger tracking every operational event and login.
- **Privacy & Integrity**: Deterministic AES-256-GCM encryption and SHA-256 payload integrity verification.
- **Settings**: Defense-in-depth detection thresholds, heartbeat timeouts, and platform configuration.

---

## 3. Defensive Security & Ethical Safety Mandate

MediShield is strictly a **DEFENSIVE SECURITY PLATFORM** designed for hospital IoMT asset protection:
- **Authorized Bounded Scope**: Security tools and assessments operate **only** against devices explicitly registered in MediShield inventory within operator-signed, time-limited scope certificates. Arbitrary internet scanning is strictly blocked at the backend.
- **Strictly Non-Destructive**: Automated exploitation, credential cracking, denial-of-service testing, medical-device shutdown, medication alteration, and real-world hardware containment are **prohibited**.
- **Transparent Simulation**: All incident response containment actions remain simulated within a virtual testbed with unmistakable indicators:
  > `"AUTHORIZED SECURITY ASSESSMENT ONLY • SIMULATION — NO REAL DEVICE CONTROL"`

---

## 4. UI/UX Architecture: Swiss International Stacked-Page Workspace

MediShield adopts the **Swiss International Style** with a document card stacking workspace:
- **Stacked Card Geometry**: Open pages are layered one behind another. Each page exhibits a visible header strip with title, category, and status indicator.
- **Top Tab Placement**: Document switching tabs are positioned cleanly at the top of the workspace.
- **Focused Foreground Card**: Clicking any visible stacked card brings it instantly to the front into the active workspace, preserving state across transitions.
- **Visual Design Rules**:
  - Background: `#F5F6F8`, Surfaces: `#FFFFFF`, Borders: `#E5E7EB`
  - Typography: Inter with strict hierarchy and monospace metadata
  - High-contrast alert indicators (Critical `#EF4444`, Warning `#F59E0B`, Success `#10B981`, Primary Blue `#1677FF`)
  - No decorative gradients, neon glows, or heavy glassmorphism.

---

## 5. Technology Stack & Architecture

- **Frontend Tier**:
  - React 18 SPA built with Vite
  - Tailwind CSS with Swiss International minimalist styling
  - Recharts for live time-series vitals & vulnerability distributions
  - Lucide React iconography
  - Centralized `api` client with automatic Bearer token management
- **Backend API Gateway (FastAPI)**:
  - Dual Router Mounting: Routes mounted primarily under `/api/v1` and secondarily under `/api` for 100% backward compatibility
  - Standardized JSON Error Envelopes: All errors return `{ error: { code, message, request_id, timestamp }, detail }`
  - Request ID Middleware: Generates and propagates `X-Request-ID` across all requests
  - Server-enforced Role-Based Access Control (`Administrator`, `Security Analyst`, `Doctor Demo`)
- **Report Generation**:
  - Publication-grade PDF Reports via **ReportLab** (executive summary, risk scores, finding catalogs, and cryptographic seals)
  - Standalone, sanitized HTML audit reports via **Jinja2** (embedded CSS, print-friendly, responsive)
  - SHA-256 hash computation for tamper-evident report verification
- **Persistence Tier**:
  - Relational PostgreSQL / Supabase schema (with automatic local SQLite fallback for offline execution)
  - SQLAlchemy 2.0 ORM with relational models (`DeviceModel`, `AssessmentModel`, `FindingModel`, `ReportModel`, `SecurityEventModel`, `AuditLogModel`, etc.)
- **Detection & Machine Learning**:
  - Heuristic IDS rules and internal scikit-learn Random Forest classifier trained on UNB CICIoMT2024 dataset

---

## 6. API Reference Summary

| Endpoint | Method | Description |
|---|---|---|
| `/api/v1/auth/login` | `POST` | Authenticate user and issue JWT Bearer token |
| `/api/v1/dashboard/summary` | `GET` | Authoritative SOC metrics, posture score, completed assessments, reports count |
| `/api/v1/devices` | `GET`, `POST` | List and register clinical IoMT devices |
| `/api/v1/assessments/authorize-scope` | `POST` | Authorize defensive scan scope certificate |
| `/api/v1/assessments/execute` | `POST` | Launch defensive multi-tool assessment |
| `/api/v1/assessments/{id}` | `GET` | Retrieve assessment status and findings |
| `/api/v1/assessments/{id}/findings` | `GET` | List normalized vulnerabilities and CVSS scores |
| `/api/v1/assessments/{id}/cancel` | `POST` | Cancel active/queued assessment |
| `/api/v1/assessments/{id}/reports` | `POST` | Generate PDF or HTML report for assessment |
| `/api/v1/reports` | `GET` | List generated security reports |
| `/api/v1/reports/{id}/download` | `GET` | Stream generated PDF or HTML report |
| `/api/v1/reports/{id}/pdf` | `GET` | Stream PDF document |
| `/api/v1/reports/{id}/html` | `GET` | Stream HTML audit page |
| `/api/v1/security-events` | `GET`, `PATCH` | List and triage security events |
| `/api/v1/audit-logs/verify-chain` | `GET` | Verify unbroken SHA-256 audit hash chain |

*(All endpoints are identically reachable under `/api/...` for full backward compatibility)*

---

## 7. Local Setup & Execution Instructions

### Prerequisites
- Python 3.11+
- Node.js 18+ & npm

### Backend Setup
```bash
cd backend
python -m venv .venv
.\.venv\Scripts\activate  # On Linux/macOS: source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```
- API Documentation (Swagger UI): `http://127.0.0.1:8000/docs`
- Health check: `http://127.0.0.1:8000/api/v1/health`

### Frontend Setup
```bash
cd frontend
npm install
npm run dev -- --host 127.0.0.1 --port 5173
```
- Open browser at: `http://127.0.0.1:5173`

### Demo Credentials (Role-Based Access Control)
- **Administrator**: `admin@medishield.local` / `adminpassword123` (Full system access, device registration)
- **Security Analyst**: `analyst@medishield.local` / `analystpassword123` (Assessment scope creation, scan execution, report generation, event triage)
- **Doctor Demo**: `doctor@medishield.local` / `doctorpassword123` (Read-only clinical vitals; restricted from security operations)

---

## 8. Automated Testing & Verification

Run the complete backend integration test suite:
```bash
cd backend
.\.venv\Scripts\pytest -v
```
**Results**:
- **41 passed integration tests** (100% pass rate) across `test_api_endpoints.py`, `test_dashboard_summary.py`, `test_health.py`, `test_real_tools_integration.py`, `test_reports_pdf_html.py`, and `test_tool_integrations.py`. Covers authentication, RBAC, scope validation, live & containerized multi-tool execution, PDF/HTML report generation, SHA-256 hash verification, assessment cancellation, authoritative dashboard summary, standardized error envelopes, ML inference, and unbroken audit chaining.

Build the frontend production bundle:
```bash
cd frontend
npm run build
```
**Results**:
- **0 errors**, production bundle compiled cleanly in `dist/`.
