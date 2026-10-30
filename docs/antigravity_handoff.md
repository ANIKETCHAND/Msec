# MediShield — Handoff & Remediation Report

**Audience:** the next agent/developer picking this repository up.
**Date:** 2026-10-30
**Branch:** `main`
**State:** working, tests green, pushed.

This document is the single source of truth for *what is already correct*, *what still needs changing*, and *how to verify anything you touch*. Read section 6 before making "improvements" — several things that look like bugs are deliberate.

---

## 1. What this project is

MediShield is an **academic IoMT (Internet of Medical Things) security and privacy prototype**: a FastAPI backend plus a React/Vite frontend. It provides asset inventory, authorized vulnerability-assessment orchestration, explainable intrusion detection, ML inference, AES-256-GCM + SHA-256 integrity, and a tamper-evident SHA-256 audit hash chain.

Hard constraints that must never be violated:

- **Defensive only.** Scanning targets only devices registered in the inventory, only with a valid signed scope certificate, only inside the declared target IP. Arbitrary/internet scanning is refused at the backend.
- **Non-destructive.** No exploitation, credential attack, DoS, device shutdown or medication alteration.
- **Simulation is labelled.** All containment/response actions are simulated and carry an explicit `SIMULATION — NO REAL DEVICE CONTROL` notice. Do not remove those labels.

---

## 2. Run it

### Backend
```bash
cd Msec/backend
python -m venv .venv
.venv/Scripts/python.exe -m pip install -r requirements.txt      # Windows
# source .venv/bin/activate && pip install -r requirements.txt    # Linux/macOS
.venv/Scripts/python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```
- Swagger: `http://127.0.0.1:8000/docs`
- Health: `http://127.0.0.1:8000/api/v1/health`

### Frontend
```bash
cd Msec/frontend
npm install
npm run dev -- --host 127.0.0.1 --port 5173
```
Open `http://127.0.0.1:5173`. Vite proxies `/api` to `127.0.0.1:8000` (see `vite.config.js`).

### Credentials (RBAC)
| Role | Email | Password | Can |
|---|---|---|---|
| Administrator | `admin@medishield.local` | `adminpassword123` | everything, incl. register + **decommission** devices |
| Security Analyst | `analyst@medishield.local` | `analystpassword123` | scope, scan, reports, triage, quarantine |
| Doctor Demo | `doctor@medishield.local` | `doctorpassword123` | read-only clinical views; security actions 403 |

Tokens are HMAC-signed and expire after **86400 s (24 h)**. An expired token produces `401` with a "log in again" message on every API call — that is expected, not a bug. Sign out and back in.

---

## 3. Verified state (reproduce before changing anything)

| Check | Command | Expected |
|---|---|---|
| Backend tests | `cd Msec/backend && .venv/Scripts/python.exe -m pytest tests/ -q` | **42 passed** |
| Frontend build | `cd Msec/frontend && npm run build` | **0 errors** |
| Audit chain | `GET /api/v1/audit-logs/verify-chain` | `chain_valid: true`, `verified_records == total_records` |
| Inventory | `GET /api/v1/devices` | 6 seeded assets, no duplicate IP/MAC |
| Routes | open every page in the sidebar | own content renders, no console errors |

Current data after cleanup: **6 devices**, ~39 assessments, ~49 reports, ~934 audit entries. Those assessment/report numbers are legitimate history; the inventory is clean.

---

## 4. Already fixed — do not rework these

1. **Real SHA-256 audit chain.** `app/services/audit_chain_service.py` chains *every* `AuditLogModel` insert through a SQLAlchemy `before_flush` hook, so any endpoint (even one that inserts a raw audit row) produces a chained record. `verify_chain` recomputes every digest and fails closed: a mutated field, missing digest, or broken `prev_hash` link returns `chain_valid: false` with the offending record id. Do not replace this with a display-only "integrity" flag.
2. **Device registration.** The server generates `DEV-<TYPE>-<nnn>` when the client omits an id, and returns **409** on duplicate IP or MAC. The frontend generates a valid locally-administered MAC (`02:…`) when one is omitted. Both Add-Device forms persist through the API and surface real errors.
3. **Reports** are real ReportLab PDFs and standalone Jinja2 HTML with a SHA-256 seal; `verify` recomputes it.
4. **Scope enforcement.** `authorize-scope` requires a registered device whose IP matches the target; off-target scans are refused (**400**).
5. **RBAC** is server-enforced (`app/middleware/rbac.py`), not just hidden in the UI.
6. **Integrity (AES-256-GCM)** records decrypt, recompute and report `VERIFIED`, and genuinely flip to `MISMATCH / TAMPERED` when a stored ciphertext/payload is altered.

---

## 5. Changes made in this pass

1. **`DELETE /api/v1/devices/{id}`** (Administrator only, `204 No Content`).
   - `404` if unknown; `409` if the device has `QUEUED`/`RUNNING` assessments (cancel first).
   - Removes the device **and** its assessments, findings, reports and scope certificates, so dashboard totals can't count data for an unregistered asset.
   - Writes a chained `DEVICE_DECOMMISSIONED` audit entry.
   - Code: `backend/app/api/devices.py`.
2. **API client handles empty bodies** (`frontend/src/services/api.js`): previously `request()` always called `res.json()`, so a `204` would throw. It now returns `null` for `204` and for empty bodies.
3. **Decommission UI** (`frontend/src/pages/DeviceInventoryPage.jsx`, `context/AppContext.jsx`): Administrator-only button per row, confirmation dialog, backend refusal (e.g. active scan, 403) shown in a dismissible banner.
4. **Code-split frontend** (`frontend/src/App.jsx`): workspace pages are `React.lazy` behind one `Suspense`; the shell, landing and login stay eager. Production bundle went from **one 903 kB chunk** to a **250 kB core** plus a 373 kB chart chunk and 6–44 kB per-page chunks.
5. **Inventory cleaned:** removed 14 test artifacts (Test X-Ray series, `127.0.0.1` pumps, duplicate Alaris rows) together with their 13 assessments, 115 findings and 17 reports; the 6 seeded assets remain.
6. **Tests clean up after themselves:** the analyst device fixture is now decommissioned at the end of its test, and `test_admin_can_decommission_device` covers 403/204/404/409-path behaviour plus chain validity.

---

## 6. Remaining work (ranked) — what to actually change

**P0 — none.** Nothing is broken; all routes and endpoints work.

**P1 — claims that need to be made honest**

1. **ML accuracy of 100%.** `GET /api/v1/detection/...` and the ML page report `Accuracy 100%` on a small bundled sample (N ≈ 719 flows from CICIoMT2024). Either evaluate on a proper held-out split and report the real number with per-class metrics (precision/recall/F1, confusion matrix), or relabel the UI to make clear it is a **small-sample demonstration**, not a generalisation claim. Do not simply hide the number — an examiner will ask.
2. **Integrity page caches records in app state.** Editing the database out-of-band leaves the page showing the previous verdict until a reload. Add a refresh control / re-fetch on tab activation so the displayed verdict always matches the backend.

**P2 — quality / completeness**

3. No `DELETE`/retire path for assessments and reports (devices now have one). Old runs accumulate; implement archive/delete with the same cascade discipline and RBAC as device decommissioning.
4. No frontend tests. If adding, start with the API client (204/error envelope) and the device form validation, since those are the historically fragile paths.
5. Deprecation warnings in the test run: `fastapi.testclient` + `httpx` and `HTTP_422_UNPROCESSABLE_ENTITY` → `HTTP_422_UNPROCESSABLE_CONTENT`. Cosmetic; fix when bumping dependencies.
6. `medishield.db` is a **local demo database** and is gitignored (`*.db`). Never commit it or hand-edit it to "fix" data — reset it instead (section 8).

---

## 7. Where things live

| Concern | File |
|---|---|
| App bootstrap, CORS, dual `/api` + `/api/v1` mount | `backend/app/main.py` |
| Router registration | `backend/app/api/router.py` |
| Devices (list/get/create/update/**delete**) | `backend/app/api/devices.py` |
| Scope + scan orchestration | `backend/app/api/assessments.py`, `backend/app/services/scanners/` |
| Reports (PDF/HTML + seal) | `backend/app/api/reports.py` |
| Integrity (AES-256-GCM + SHA-256) | `backend/app/api/integrity.py`, `backend/app/services/crypto_service.py` |
| Audit chain | `backend/app/services/audit_chain_service.py`, `backend/app/api/audit_logs.py` |
| RBAC | `backend/app/middleware/rbac.py` |
| Seeding / auto-migration | `backend/app/database/init_db.py` |
| Frontend routes | `frontend/src/App.jsx` (lazy page map) |
| Page titles/metadata | `frontend/src/utils/pageRegistry.js` |
| Global state + actions | `frontend/src/context/AppContext.jsx` |
| REST client | `frontend/src/services/api.js` |
| Stacked workspace shell | `frontend/src/components/stack/PageStack.jsx`, `layouts/WorkspaceShell.jsx` |

---

## 8. Reset to pristine demo data

```bash
cd Msec/backend
rm medishield.db          # Windows: del medishield.db
# restart uvicorn — startup re-seeds 6 devices, users, events, integrity records
```
The seed path is idempotent: it creates missing rows and self-heals missing columns (`_auto_migrate_columns`), so restarting does not duplicate devices. **Do not** run `seed_database()` from ad-hoc scripts against the live file — that is how the duplicate rows cleaned up in this pass were introduced.

---

## 9. Definition of done for any change here

1. `pytest tests/ -q` → all pass (count only grows if you add real coverage).
2. `npm run build` → 0 errors.
3. Click through the workflow you touched: login → dashboard → assessment → report → audit; verify `chain_valid: true` **after** your change.
4. Backend log shows no `5xx`. `4xx` on negative tests (401/403/404/409) is correct behaviour.
5. Update this document and the API table in `README.md` if you add/remove an endpoint.
