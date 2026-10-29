# Msec (MediShield) — Complete Fix Report for Antigravity

> **Purpose of this document:** Everything below was verified by direct code inspection
> (file + line references) and/or by running the test suite. Treat each numbered item as a
> task: it states what is wrong, where it lives, and what "correct" looks like. Nothing in
> this list is speculative — if an item says "verify", it is explicitly marked as unverified.

---

## 0. Project shape (read this first)

```
Msec/
├── backend/                 FastAPI + SQLAlchemy (SQLite), Python
│   ├── app/
│   │   ├── main.py          app factory, CORS, mounts api_v1_router at /api/v1 AND /api
│   │   ├── config.py        pydantic-settings (pydantic_settings.BaseSettings)
│   │   ├── api/router.py    master router: health, auth, dashboard, devices, assessments,
│   │   │                    reports, security_events(+events), incidents, telemetry,
│   │   │                    detection, integrity, audit_logs, simulation, settings
│   │   ├── middleware/rbac.py  HTTPBearer + ?token= query fallback; require_admin /
│   │   │                    require_analyst = ["Administrator","Security Analyst"]
│   │   ├── services/scanners/  14 adapters + orchestrator.py + scope_validator.py
│   │   ├── database/init_db.py seed_database(): 3 users, 6 devices, demo rows
│   │   └── models/db_models.py
│   ├── tests/               6 pytest files (test_api_endpoints, test_health,
│   │                         test_dashboard_summary, test_reports_pdf_html,
│   │                         test_tool_integrations, test_real_tools_integration)
│   ├── scripts/             run_qa_functional_audit.py, clone_tool_repos.py
│   └── requirements.txt
└── frontend/                React 18 + Vite 5 + Tailwind (no TypeScript)
    ├── vite.config.js       dev proxy: /api -> http://127.0.0.1:8000
    └── src/
        ├── App.jsx          pageMap (string-keyed router, not react-router)
        ├── layouts/WorkspaceShell.jsx   sidebar nav (primary + secondary lists)
        ├── context/AppContext.jsx       global state + optimistic API calls
        ├── services/api.js              fetch wrapper, API_BASE='/api/v1'
        ├── utils/pageRegistry.js        page id -> title/icon metadata
        └── pages/*.jsx                  19 page components
```

**Runtime contract (already correct — do not "fix" these):**
- Frontend calls `/api/v1/...`; Vite proxies `/api` to `127.0.0.1:8000`; backend mounts
  the same router under both `/api/v1` and `/api`.
- Auth: `POST /auth/login` → JWT stored as `medishield_token`; every request sends
  `Authorization: Bearer`. Downloads may pass `?token=` (rbac.py line 16 explicitly
  supports the query parameter).
- Seeded users (init_db.py:60-80): `admin@medishield.local / adminpassword123`
  (Administrator), `analyst@medishield.local / analystpassword123` (Security Analyst),
  `doctor@medishield.local / doctorpassword123` (Doctor Demo).
- RBAC roles are exactly: `Administrator`, `Security Analyst`, `Doctor Demo`.
- `scope_validator.ALLOWED_PROFILES = {DEFENSIVE_AUDIT, PASSIVE_DISCOVERY, COMPLIANCE_SCAN}`
  — anything else returns HTTP 400.

---

## 1. P0 — Actual bugs (something a user or the backend will hit)

### 1.1 Frontend calls a method that does not exist → Scan Results page crashes
- **Where:** `frontend/src/pages/ScanResultsPage.jsx:75` calls
  `api.getAssessmentById(asmId)`.
- **Reality:** `frontend/src/services/api.js` defines `getAssessment(assessmentId)`
  (around line 261). There is **no** `getAssessmentById` anywhere in api.js.
- **Effect:** `TypeError: api.getAssessmentById is not a function` — the Promise array in
  `useEffect` never resolves, findings/reports never render for a selected assessment.
- **Fix (either):** rename the call to `api.getAssessment(asmId)`, or add an alias
  `async getAssessmentById(id) { return this.getAssessment(id); }` to api.js. Prefer the
  rename (one line, no API surface growth).
- **Acceptance:** open Scan Results, select an assessment → assessment detail + findings +
  reports load; console has no TypeError.

### 1.2 Assessment profile dropdown offers values the backend rejects (HTTP 400)
- **Where:** `frontend/src/pages/AssessmentCenterPage.jsx:555-557` —
  `<option value="VULNERABILITY_DISCOVERY">` and `<option value="COMPLIANCE_VERIFICATION">`.
- **Reality:** backend `app/services/scope_validator.py:36-40` allows only
  `DEFENSIVE_AUDIT`, `PASSIVE_DISCOVERY`, `COMPLIANCE_SCAN`; `validate_new_scope_request`
  raises 400 for anything else (line 92-95).
- **Effect:** choosing either of those two profiles makes `POST /assessments/authorize-scope`
  fail with "Assessment profile ... is unrecognized".
- **Note:** `DevicesScanPage.jsx:829-831` already uses the three valid values — use it as
  the reference. Also `schemas/assessment.py:12` documents the same three.
- **Fix:** replace the two option values with `PASSIVE_DISCOVERY` and `COMPLIANCE_SCAN`
  (update the labels to describe them). If new profiles are genuinely wanted, they must be
  added to `ALLOWED_PROFILES` **and** implemented in `orchestrator.py` tool selection first —
  do not just widen the validator.
- **Acceptance:** for every option in the dropdown,
  `POST /assessments/authorize-scope` returns 201, not 400.

### 1.3 Three API routers are imported nowhere but four pages are orphaned (dead UI)
Verified by import/route graph:

| Page file | Imported in App.jsx? | In `pageMap`? | Reachable? |
|---|---|---|---|
| `IncidentManagementPage.jsx` | **No** | **No** | **No** |
| `MLDetectionPage.jsx` | **No** | **No** | **No** |
| `Phase1VerificationPage.jsx` | **No** | **No** | **No** |
| `AssessmentCenterPage.jsx` | Yes (line 16) | **No** — `'assessment-center'` maps to `<DevicesScanPage/>` (App.jsx:34) | No (shadowed) |
| `NetworkTopologyPage.jsx` | Yes | Yes (`topology`) | Only via DashboardPage:487 button + WorkspaceShell:91; **not in sidebar** |
| `ResponseSimulatorPage.jsx` | Yes | Yes (`response-simulator`) | **No nav entry anywhere** — only `layouts/DashboardLayout.jsx:51`, and that layout is itself unused (exported at line 29, never imported) |

- **Backend counterparts that therefore have no UI:** `/incidents*`
  (list, create, notes, status, correlate), `/detection/evaluate`,
  `/detection/status`, `/simulation/scenarios/{name}` (only reachable indirectly through
  AppContext helpers with no page using them).
- **Fix:** decide the intended navigation model and make it consistent:
  1. Add `incidents`, `ml-detection` (and optionally `phase1-verify`) to `App.jsx` pageMap,
     `pageRegistry.js`, and `WorkspaceShell.jsx` nav lists (secondary list lines 72-77;
     put incidents under MONITORING next to `security-events`).
  2. Either wire `AssessmentCenterPage` as its own route or delete it (it duplicates
     `DevicesScanPage`; its registry entry at pageRegistry.js:47-53 even has
     `id: 'devices-scan'` — a copy/paste bug: key is `assessment-center`, id is
     `devices-scan`).
  3. Add `topology` and `response-simulator` to the WorkspaceShell secondary nav, **or**
     delete `ResponseSimulatorPage` + `DashboardLayout.jsx` if the feature was cut.
     Deleting `DashboardLayout.jsx` is safe (it is never imported).
  4. Remove unused imports from App.jsx if pages are deleted.
- **Acceptance:** every file in `src/pages/` is either reachable from the sidebar
  (or an explicit deep-link) or deleted; `grep -r "DashboardLayout" src/` returns nothing
  if deleted.

### 1.4 `audit-logs` GET is analyst-only, but the page shows client-fabricated entries
- **Backend:** `app/api/audit_logs.py:14-31` — `GET /audit-logs` requires `require_analyst`
  (Administrator or Security Analyst only). `Doctor Demo` gets 403.
- **Frontend:** `AppContext.jsx:289-301` `logAudit()` creates entries **locally only**
  (`setAuditLogs(prev => [newLog, ...prev])`), with a random ID
  (`AUD-2026-<random>`), hardcoded `ipAddress: "192.168.1.104"`, and never posts to the
  backend. The backend has **no** `POST /audit-logs` endpoint (by design — audit rows are
  written server-side inside mutations).
- **Effect:** the Audit Logs page mixes real backend hash-chained entries with fake local
  ones that are *not* part of the SHA-256 chain, undermining the page's claim
  ("SHA-256 Cryptographic Hash Chain Ledger"). Also, `AuditLogsPage.jsx:43` only calls
  `verifyAuditChain()`; the list it renders comes from context state.
- **Fix:** render only backend data (`api.getAuditLogs()`) in AuditLogsPage; keep
  `logAudit()` only as a transient UI affordance if needed, clearly separated, or remove it.
  Handle the 403 for `Doctor Demo` with an explicit "analyst role required" empty state.
- **Acceptance:** every row shown in Audit Logs also appears in
  `GET /audit-logs`; chain verification reports `valid: true` over exactly those rows.

### 1.5 Environment: backend tests cannot run at all on this machine
- **Command run:** `cd Msec/backend && python -m pytest tests/ -q -p no:cacheprovider`
- **Result:** 6 collection errors — `ModuleNotFoundError: No module named 'pydantic_settings'`
  (from `app/config.py:6`). System interpreter is **Python 3.14**
  (`C:\Python314`, note `E:\CODE\...` paths in tracebacks).
- **Risks to handle:** `requirements.txt` pins `numpy<2`, `pandas<3`, `scikit-learn<1.6`,
  `matplotlib<4` — wheels for Python 3.14 may not exist for these pins.
- **Fix:**
  1. Create a venv with a supported interpreter (3.11 or 3.12 strongly preferred).
  2. `pip install -r requirements.txt`; if the pinned scientific stack fails to build on
     3.14, bump the pins rather than skipping tests.
  3. Re-run `python -m pytest tests/ -q` from `Msec/backend`.
  4. Note: an unrelated `pytest.ini` exists at the repo root
     (`E:\CODE\AI-ECG-Analyzer\pytest.ini`) and gets picked up as `inifile` — run from
     `Msec/backend` so testpaths/cwd are correct, or add `Msec/backend/pytest.ini`.
- **Acceptance:** full suite collects and passes; reconcile the result with the claim in
  `README.md` ("26 passed integration tests") — update README if the real number differs.

---

## 2. P1 — Correctness / honesty issues to fix or explicitly waive

### 2.1 Hardcoded demo numbers contradict seeded data
- `LandingPage.jsx:190-202`: "64 Devices", "99.8% Acc.", "14 Tools" are hardcoded.
  The DB seeds **6 devices** (`init_db.py:90,109,128,147,166,185`).
- `pageRegistry.js:31`: subtitle "64 Monitored Clinical Assets & Segments".
- **Fix:** either seed 64 devices (and make accuracy/tools numbers derived from
  `GET /dashboard/summary` + `GET /assessments/tools/inventory`), or change the copy to
  the true numbers. Landing stats should come from the API when available, with the
  static value only as an SSR-less fallback.
- **Acceptance:** landing stat block and sidebar subtitle match
  `GET /dashboard/summary.monitored_devices`.

### 2.2 Persona/role switching in the shell issues API calls under a stale role
- `AppContext.jsx` loads `devices`, `securityEvents`, `incidents`, `auditLogs`,
  `integrityResults`, `detectionStatus` on `currentUser` change (lines 166-175) with
  `.catch(() => null)` — failures are silent, so the UI can show **seed context data**
  while the API rejected the call (e.g. `auditLogs` for Doctor Demo = 403).
- `AppContext.jsx:166` re-logs-in with `currentUser.password || "analystpassword123"` —
  a stored plaintext password in `localStorage` (`medishield_user`). This is both a
  security smell and a correctness trap (stale password → login fails → context keeps old data).
- **Fix:** persist only `{email, role}` + the token; on reload validate with
  `GET /auth/me`; surface a toast/banner when a scoped fetch fails instead of
  `.catch(() => null)` for data the page displays.

### 2.3 Reports CSV fallback inconsistency
- `ReportsPage.jsx:146` calls `api.downloadCsvFile('/reports/assessments.csv', ...)`
  — backend has this route (`reports.py:162`). OK.
- But `downloadCsvFile` builds `${API_BASE}${endpoint}` — fine. **Verify only:** that the
  3 CSV routes (`/reports/security-events.csv`, `/reports/incidents.csv`,
  `/reports/assessments.csv`) are all reachable from the UI; today only `assessments.csv`
  has a caller. Either wire the other two export buttons or remove the endpoints.

### 2.4 Token-in-query for report links
- `api.js:316-368` appends `?token=<jwt>` to report URLs used with `window.open`
  (ReportsPage.jsx:91,110). Supported by the backend, but JWTs land in browser history,
  server logs, and Referer headers.
- **Fix (preferred):** use `downloadReportFile()` (Authorization header + blob) everywhere;
  for HTML preview, fetch with headers and use a blob URL instead of `window.open`.
  If left as-is, document it as a demo-only tradeoff.

### 2.5 Orphan `engine_pipeline_result.json`
- `Msec/backend/engine_pipeline_result.json` is a stale run artifact sitting at the
  backend root. Move to `docs/` or `scripts/qa_audit_results.json`-style location, or
  gitignore it.

---

## 3. P2 — Verification checklist (things I could NOT fully verify)

Run these after the P0 fixes; each has a concrete probe.

1. **Tool inventory shape mismatch risk.** `ToolsManagementPage.jsx:41` and
   `DevicesScanPage.jsx:414` do `api.getToolInventory().catch(() => [])` and then map the
   result. Confirm `orchestrator.get_tool_inventory()` returns a **list** (not an object)
   — if it returns `{"tools": [...]}`, the pages must do `.tools ?? []`.
   Probe: `GET /api/v1/assessments/tools/inventory` after login, inspect JSON top level.
2. **End-to-end scan flow for all three profiles:**
   `POST /devices` → `POST /assessments/authorize-scope` (each profile) →
   `POST /assessments/execute` → `GET /assessments/{id}/findings` →
   `POST /assessments/{id}/reports` → `GET /reports/{id}/download`.
   `scripts/run_qa_functional_audit.py` already encodes part of this — run it.
3. **Real-tool integration vs simulated fallback.** `tests/test_real_tools_integration.py`
   requires nmap/nuclei/etc. installed. Confirm the test skips cleanly (not fails) when
   binaries are absent, and that `orchestrator` reports tools as unavailable rather than
   emitting fabricated findings.
4. **Scope enforcement.** `scope_validator.py` must reject: target IP not belonging to the
   registered device, expired scope on execute, revoked scope on execute, and tools not in
   `selected_tools`. Add/extend tests in `tests/test_api_endpoints.py` if gaps are found.
5. **Doctor Demo UX.** Log in as `doctor@medishield.local` and walk the sidebar: pages that
   depend on analyst-only endpoints (audit logs list, reports summary, assessments) must
   show a permission empty-state, not a spinner or silent stale data.
6. **Seeded `INITIAL_DEVICES` in AppContext.** Confirm it does not override API data after
   `GET /devices` succeeds (last-writer-wins order in `syncWithBackend`), otherwise the
   inventory can silently revert to demo rows.
7. **`README.md` claims audit.** Verify each claim (test counts, tool list, endpoint list)
   against the code and update the README.

---

## 4. Suggested execution order for Antigravity

1. **Environment** — venv (py3.11/3.12), `pip install -r requirements.txt`, make
   `pytest tests/ -q` green. Everything else needs a runnable backend. (§1.5)
2. **One-line frontend crash** — `getAssessmentById` → `getAssessment`. (§1.1)
3. **Profile dropdown values** — align AssessmentCenterPage options with
   `ALLOWED_PROFILES`. (§1.2)
4. **Navigation consistency** — wire or delete Incident/MLDetection/AssessmentCenter/
   ResponseSimulator/DashboardLayout; fix the `assessment-center` registry id; add missing
   sidebar entries. (§1.3)
5. **Audit page integrity** — render only backend audit rows; role-gated empty state. (§1.4)
6. **Demo-number honesty + auth persistence** — §2.1, §2.2.
7. **Security polish** — token-in-query removal, localStorage password removal (§2.2, §2.4).
8. **Run the §3 checklist** and update README with the real, verified state.

**Definition of done:** backend test suite green; every page reachable or deleted; no
console errors during a full sidebar walk with each of the 3 seeded users; README claims
match observed behavior.
