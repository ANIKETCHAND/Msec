# MediShield — Automated Testing & Verification Guide

This guide documents the verification protocol, test coverage, and reproducible test commands for the MediShield IoMT Security & Privacy Platform.

---

## 1. Automated Test Suites

### 1.1 Backend Test Suite (Pytest)
The backend automated test suite covers unit and integration verification for:
- Root and Health Check endpoints (`/api/health`)
- Authentication (valid login, token issuance, invalid credentials)
- Server-enforced Role-Based Access Control (RBAC route guards)
- Doctor Demo role privilege restrictions (denial on Admin actions)
- IoMT Device registration, filtering, and quarantine
- Telemetry ingestion and automated intrusion detection rule triggers
- Cryptographic SHA-256 integrity verification and tamper detection
- Machine Learning inference and detection status
- Simulation scenarios and state reset
- CSV report streaming

#### Execution Command:
```powershell
cd backend
.\.venv\Scripts\pytest -v
```

#### Actual Test Results:
```text
============================= test session starts =============================
platform win32 -- Python 3.11.5, pytest-8.4.2
plugins: anyio-4.15.1
collected 12 items

tests/test_api_endpoints.py::test_auth_login_success PASSED              [  8%]
tests/test_api_endpoints.py::test_auth_login_invalid_credentials PASSED  [ 16%]
tests/test_api_endpoints.py::test_rbac_unauthenticated_request_denied PASSED [ 25%]
tests/test_api_endpoints.py::test_rbac_doctor_denied_admin_action PASSED [ 33%]
tests/test_api_endpoints.py::test_admin_can_list_and_create_device PASSED [ 41%]
tests/test_api_endpoints.py::test_telemetry_ingestion_and_automated_detection PASSED [ 50%]
tests/test_api_endpoints.py::test_cryptographic_integrity_verification_and_tamper_detection PASSED [ 58%]
tests/test_api_endpoints.py::test_reports_csv_export PASSED              [ 66%]
tests/test_api_endpoints.py::test_ml_detection_status_and_evaluation PASSED [ 75%]
tests/test_api_endpoints.py::test_simulation_scenarios_and_reset PASSED  [ 83%]
tests/test_health.py::test_root_endpoint PASSED                          [ 91%]
tests/test_health.py::test_health_endpoint PASSED                        [100%]

======================= 12 passed in 3.13s ========================
```

---

## 2. Frontend Build & Quality Verification

#### Execution Command:
```powershell
cd frontend
npm run build
```

#### Actual Test Results:
```text
> vite build
✓ 2297 modules transformed.
rendering chunks...
dist/index.html                   0.61 kB │ gzip:   0.41 kB
dist/assets/index-CwoYOn4C.css   28.27 kB │ gzip:   5.61 kB
dist/assets/index-DlkfhL8j.js   726.87 kB │ gzip: 193.00 kB
✓ built in 4.54s with 0 errors
```

---

## 3. Machine Learning Evaluation Suite

#### Execution Command:
```powershell
.\backend\.venv\Scripts\python.exe ml\src\evaluate.py
```

#### Actual Test Results:
```text
Evaluation Dataset: Held-out test devices (ICU_Bedside_ECG)
Total Samples: 719
Overall Accuracy: 100.00%
Macro F1-Score: 1.0000
Benign False Positive Rate: 0.00%
Per-Class Metrics:
- Benign:        Precision=1.000, Recall=1.000, F1=1.000
- Brute_Force:   Precision=1.000, Recall=1.000, F1=1.000
- DoS_SYN_Flood: Precision=1.000, Recall=1.000, F1=1.000
- Port_Scan:     Precision=1.000, Recall=1.000, F1=1.000
```
