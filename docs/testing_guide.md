# MediShield — Testing & Quality Assurance Guide

This guide details the testing framework, test execution procedures, and security checks implemented in MediShield.

---

## 1. Testing Philosophy

- **Honest Test Execution**: Never fabricate test runs, mock outputs without clear labeling, or skip failing assertions.
- **Security Boundaries**: Validate input schemas with negative test cases (malformed payloads, unexpected fields, SQL injection attempts).
- **Subsystem Isolation**: Unit test detection rules and cryptographic operations independently from network calls.

---

## 2. Running Automated Tests

### 2.1 Backend Unit & Integration Tests

From the `medishield/backend` directory:

```powershell
# Activate Python 3.11 virtual environment
.\.venv\Scripts\Activate.ps1

# Run full pytest test suite with verbose output
pytest -v

# Run with test coverage report
pytest --cov=app tests/
```

### 2.2 Test Structure
- `tests/test_health.py`: Verifies `/` and `/api/health` endpoints, ensuring service diagnostics return HTTP 200 and schema validity.
- *(Future Phases)*:
  - `tests/test_devices.py`: Device CRUD, filtering, pagination, and schema validation.
  - `tests/test_rbac.py`: Permissions matrices across Admin, Analyst, and Doctor roles.
  - `tests/test_detection_rules.py`: Verification that rules fire on exact thresholds and do not false-alarm on normal traffic.
  - `tests/test_cryptography.py`: AES-GCM encryption/decryption, nonce uniqueness, and SHA-256 hash tamper detection.
  - `tests/test_ml_inference.py`: Feature schema verification and model error handling.

---

## 3. Frontend Quality & Build Verification

From the `medishield/frontend` directory:

```bash
# Verify production build compilation
npm run build

# Start preview server for production bundle
npm run preview
```

Ensure no TypeScript or JSX runtime warnings or missing imports occur.

---

## 4. Security Verification Checklist

- [x] No plaintext credentials or keys committed to Git repositories.
- [x] `.env` is listed in `.gitignore` and `.env.example` provides sanitized templates.
- [x] CORS origins explicitly restricted (default: `http://localhost:5173`).
- [x] Pydantic models validate all incoming request bodies.
- [x] Safe simulation scenarios operate only on synthetic in-memory/database state; never scan external networks.
