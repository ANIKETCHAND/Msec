# MediShield — IoMT Security & Privacy Platform (v2.0)

> **Enterprise IoMT Cybersecurity Platform & Research Assessment Suite**  
> An integrated defensive security operations platform for the Internet of Medical Things (IoMT). Provides real-time asset posture monitoring, explainable rule-based intrusion detection, authentic machine learning attack classification, authorized vulnerability assessment orchestration (Nmap, Nuclei, ZAP, Nikto, OpenVAS), publication-grade ReportLab PDF & standalone Jinja2 HTML report generation with SHA-256 cryptographic seals, persistent incident investigation tickets, and unbroken SHA-256 audit hash chaining.

---

## 1. Guided User Workflow

MediShield provides a single, guided operational workflow designed for clinical security teams:

```text
USER OPENS MEDISHIELD
          │
          ▼
     LANDING PAGE
          │
          ▼
        LOGIN (RBAC Authentication)
          │
          ▼
  ASSESSMENT CENTER
          │
          ▼
 SELECT REGISTERED IoMT DEVICE
          │
          ▼
 VERIFY AUTHORIZATION & SCOPE (Defensive Certificate)
          │
          ▼
 CONFIGURE & START ASSESSMENT (Multi-Tool Orchestrator)
          │
          ▼
    RUN SECURITY SCAN (Background Execution & Polling)
          │
          ▼
 PARSE & NORMALIZE FINDINGS (CVSS Enrichment)
          │
          ▼
 CALCULATE RISK & POSTURE SCORE
          │
          ▼
 GENERATE SECURITY REPORT
       /          \
      ▼            ▼
  PDF REPORT    HTML REPORT (ReportLab & Jinja2 with SHA-256 Seal)
          │
          ▼
 PERSIST SECURITY EVENTS (Auto-Emission for High/Critical)
          │
          ▼
 REVIEW SECURITY EVENTS
          │
          ▼
 INVESTIGATE INCIDENT (2-Column Queue & Details)
          │
          ▼
 ADD NOTES / TRACK REMEDIATION (POST /api/v1/incidents/{id}/notes)
          │
          ▼
 UPDATE INCIDENT STATUS (PATCH /api/v1/incidents/{id}/status)
          │
          ▼
 AUDIT TRAIL & HASH-CHAIN VERIFICATION (SHA-256 Chain)
```

---

## 2. Defensive Security & Ethical Safety Mandate

MediShield is strictly a **DEFENSIVE SECURITY PLATFORM** designed for hospital IoMT asset protection:
- **Authorized Bounded Scope**: Security tools and assessments operate **only** against devices explicitly registered in MediShield inventory within operator-signed, time-limited scope certificates. Arbitrary internet scanning is strictly blocked at the backend.
- **Strictly Non-Destructive**: Automated exploitation, credential cracking, denial-of-service testing, medical-device shutdown, medication alteration, and real-world hardware containment are **prohibited**.
- **Transparent Simulation**: All incident response containment actions remain simulated within a virtual testbed with unmistakable indicators:
  > `"AUTHORIZED SECURITY ASSESSMENT ONLY • SIMULATION — NO REAL DEVICE CONTROL"`

---

## 3. UI/UX Architecture: Swiss International Stacked-Page Workspace

MediShield adopts the **Swiss International Style** with a document card stacking workspace inspired by physical document decks:
- **Stacked Card Geometry**: Open pages are layered one behind another. Each page exhibits a visible header strip with title, category, and status indicator.
- **Top Tab Placement**: Document switching tabs are positioned cleanly at the top of the workspace.
- **Focused Foreground Card**: Clicking any visible stacked card brings it instantly to the front into the active workspace, preserving state across transitions.
- **Visual Design Rules**:
  - Background: `#F5F6F8`, Surfaces: `#FFFFFF`, Borders: `#E5E7EB`
  - Typography: Inter with strict hierarchy and monospace metadata
  - High-contrast alert indicators (Critical `#EF4444`, Warning `#F59E0B`, Success `#10B981`, Primary Blue `#1677FF`)
  - No decorative gradients, neon glows, or heavy glassmorphism.

---

## 4. Technology Stack & Scalable Architecture

- **Frontend Tier**:
  - React 18 SPA built with Vite
  - Tailwind CSS with Swiss International minimalist styling
  - Recharts for live time-series vitals & vulnerability distributions
  - Lucide React iconography
  - Centralized `apiClient` with automatic Bearer token management
- **Backend API Gateway (FastAPI)**:
  - Dual Router Mounting: Routes mounted primarily under `/api/v1` and secondarily under `/api` for 100% backward compatibility
  - Centralized Exception Handling: Structured domain exceptions (`MediShieldException`, `ResourceNotFoundException`, `InvalidAssessmentScopeException`) with standardized error envelopes
  - Server-enforced Role-Based Access Control (`Administrator`, `Security Analyst`, `Doctor Demo`)
- **Report Generation**:
  - Publication-grade PDF Reports via **ReportLab** (executive summary, risk scores, finding catalogs, and cryptographic seals)
  - Standalone, sanitized HTML audit reports via **Jinja2** (embedded CSS, print-friendly, responsive)
  - SHA-256 hash computation for tamper-evident report verification
- **Persistence Tier**:
  - Relational PostgreSQL / Supabase schema (with automatic local SQLite fallback for offline execution)
  - SQLAlchemy 2.0 ORM with 13 relational models (`DeviceModel`, `AssessmentModel`, `FindingModel`, `ReportModel`, `IncidentModel`, `IncidentNoteModel`, `SecurityEventModel`, `AuditLogModel`, etc.)
- **Machine Learning Subsystem**:
  - scikit-learn (Random Forest classifier trained on UNB CICIoMT2024 dataset)

---

## 5. API Reference Summary

| Endpoint | Method | Description |
|---|---|---|
| `/api/v1/auth/login` | `POST` | Authenticate user and issue JWT Bearer token |
| `/api/v1/devices` | `GET`, `POST` | List and register clinical IoMT devices |
| `/api/v1/assessments/authorize-scope` | `POST` | Authorize defensive scan scope certificate |
| `/api/v1/assessments/execute` | `POST` | Launch defensive multi-tool assessment |
| `/api/v1/assessments/{id}` | `GET` | Retrieve assessment status and findings |
| `/api/v1/assessments/{id}/cancel` | `POST` | Cancel active/queued assessment |
| `/api/v1/assessments/{id}/reports` | `POST` | Generate PDF or HTML report for assessment |
| `/api/v1/reports` | `GET` | List generated security reports |
| `/api/v1/reports/{id}/download` | `GET` | Stream generated PDF or HTML report |
| `/api/v1/reports/{id}/pdf` | `GET` | Stream PDF document |
| `/api/v1/reports/{id}/html` | `GET` | Stream HTML audit page |
| `/api/v1/security-events` | `GET`, `PATCH` | List and triage security events |
| `/api/v1/incidents` | `GET`, `POST` | Incident queue tickets |
| `/api/v1/incidents/{id}/notes` | `POST` | Add persistent analyst investigation note |
| `/api/v1/incidents/{id}/status` | `PATCH` | Update incident status and resolution notes |
| `/api/v1/audit-logs/verify-chain` | `GET` | Verify unbroken SHA-256 audit hash chain |

*(All endpoints are identically reachable under `/api/...` for full backward compatibility)*

---

## 6. Local Setup & Execution Instructions

### Prerequisites
- Python 3.11+
- Node.js 18+ & npm

### Backend Setup
```bash
cd backend
python -m venv .venv
.\.venv\Scripts\activate  # On Linux/macOS: source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --host 127.0.0.1 --port 8000
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
- **Security Analyst**: `analyst@medishield.local` / `analystpassword123` (Assessment scope creation, scan execution, report generation, incident triage)
- **Doctor Demo**: `doctor@medishield.local` / `doctorpassword123` (Read-only clinical vitals; restricted from security operations)

---

## 7. Automated Testing & Verification

Run the complete backend integration test suite:
```bash
cd backend
.\.venv\Scripts\pytest -v
```
**Results**:
- **22 passed integration tests** covering authentication, RBAC, scope validation, multi-tool execution, PDF/HTML report generation, SHA-256 hash verification, incident notes, assessment cancellation, and audit chaining.

Build the frontend production bundle:
```bash
cd frontend
npm run build
```
**Results**:
- **0 errors**, production bundle compiled cleanly in `dist/`.
