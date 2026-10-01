# MediShield — Setup & Local Execution Guide

This guide describes how to configure, install, and run the MediShield platform locally for academic research and evaluation.

---

## 1. Prerequisites

- **Python**: Version 3.11 (or compatible 3.10–3.12).
- **Node.js**: Version 18+ (verified on Node v24).
- **Package Managers**: `npm` and `pip`.
- **Operating System**: Windows, macOS, or Linux.
- **Git**: Installed for version control.

---

## 2. Directory Structure Overview

```text
medishield/
├── frontend/             # React 18 + Vite SPA interface
├── backend/              # FastAPI application server
│   ├── app/              # Source code (API, schemas, config)
│   ├── tests/            # Automated test suite
│   ├── requirements.txt  # Python dependencies
│   └── .env.example      # Environment variable template
├── ml/                   # Machine learning data, pipeline & models
│   ├── data/             # Dataset directory (CICIoMT2024)
│   ├── src/              # Preprocessing, training, inference
│   └── artifacts/        # Trained model weights & encoders
├── database/             # Relational schemas & migrations
│   ├── schema.sql        # Core PostgreSQL schema
│   └── seed_demo_data.py # Synthetic data generation script
├── docs/                 # System documentation & guides
└── README.md             # Project overview
```

---

## 3. Backend Setup

### 3.1 Create and Activate Virtual Environment
From the `medishield/backend` directory:

**Windows (PowerShell):**
```powershell
py -3.11 -m venv .venv
.\.venv\Scripts\Activate.ps1
```

**Linux / macOS:**
```bash
python3.11 -m venv .venv
source .venv/bin/activate
```

### 3.2 Install Dependencies
```bash
pip install --upgrade pip
pip install -r requirements.txt
```

### 3.3 Configure Environment Variables
Copy the template configuration file:
```bash
cp .env.example .env
```
Ensure `.env` contains valid local development values (safe defaults are provided in the template). Never commit `.env` to source control.

### 3.4 Launch FastAPI Backend
```bash
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```
- API Base URL: `http://127.0.0.1:8000`
- Interactive OpenAPI Docs: `http://127.0.0.1:8000/docs`
- Health Check: `http://127.0.0.1:8000/api/health`

---

## 4. Frontend Setup

### 4.1 Install Node Packages
From the `medishield/frontend` directory:
```bash
npm install
```

### 4.2 Configure Environment Variables
```bash
cp .env.example .env
```
Default content:
```env
VITE_API_BASE_URL="http://127.0.0.1:8000"
VITE_APP_TITLE="MediShield — IoMT Security & Privacy Platform"
```

### 4.3 Launch Vite Development Server
```bash
npm run dev
```
The frontend is served at: `http://127.0.0.1:5173`.
Proxy rules in `vite.config.js` will route `/api/*` requests directly to the FastAPI server at `http://127.0.0.1:8000`.

---

## 5. Running Automated Tests

Run backend tests using `pytest`:
```bash
cd backend
.\.venv\Scripts\pytest -v
```

Verify frontend build passes:
```bash
cd frontend
npm run build
```
