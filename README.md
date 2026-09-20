# ClubOps AI — Enterprise Campus Event Operations Platform

[![FastAPI](https://img.shields.io/badge/Backend-FastAPI_0.115+-009688?style=flat&logo=fastapi)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/Frontend-React_19_+_Vite-61DAFB?style=flat&logo=react)](https://react.dev)
[![TailwindCSS](https://img.shields.io/badge/Styling-Tailwind_CSS_v4-06B6D4?style=flat&logo=tailwindcss)](https://tailwindcss.com)
[![Groq](https://img.shields.io/badge/AI_Engine-Groq_LPU-F55036?style=flat)](https://groq.com)
[![Tests](https://img.shields.io/badge/Pytest-50%2F50_Passed_(100%25)-brightgreen?style=flat)](file:///e:/ClubOps/backend/tests)
[![Build](https://img.shields.io/badge/Vite_Build-Passing_(0_errors)-brightgreen?style=flat)](file:///e:/ClubOps/frontend)

> **Core Product Principle**:
> **HUMAN AUTHORITY + DETERMINISTIC CONSTRAINTS + AI INTELLIGENCE + CONTROLLED ACTIONS**

ClubOps AI is a production-grade operations platform designed for university clubs and campus organizations. It replaces disjointed spreadsheets, WhatsApp threads, and fragmented notes with a unified, role-governed platform featuring structured AI assistance, real-time collaboration, deterministic risk monitoring, and a cryptographically verifiable SHA-256 audit trail.

---

## The Problem

College clubs coordinate large-scale events across disconnected platforms:
- **Scattered Communication**: Task deadlines lost in WhatsApp group chats.
- **Unclear Ownership**: Volunteer tasks assigned verbally without accountability.
- **Understaffing Surprises**: Skill shortages discovered on event day.
- **Institutional Amnesia**: Learnings and past budgets disappear when club leadership graduates.
- **Zero Verifiability**: No proof of financial compliance or operational integrity.

---

## The Solution: ClubOps AI

ClubOps AI centralizes the entire lifecycle of student organizations into an interconnected operational ecosystem:

```
+-----------------------------------------------------------------------------------+
|                             React 19 + Vite Frontend                              |
|  - Strict Role-Isolated Workspaces (President | Club Head | Volunteer)            |
|  - Visual Kanban Task Progression Board (TODO -> IN_PROGRESS -> DONE -> BLOCKED)  |
|  - Real-Time Collaboration Gateway (WebSockets, Channels, Activity Ticker)        |
|  - Event Creator with AI Staffing & Skill Breakdown Modal                         |
|  - Operational Analytics Suite (Deterministic Club Health Score 0-100, Recharts)  |
|  - Cryptographic Audit Trail Explorer & Live SHA-256 Tamper Verifier              |
+------------------------------------------+----------------------------------------+
                                           | HTTPS / WSS (JWT Auth)
                                           v
+-----------------------------------------------------------------------------------+
|                                FastAPI Backend                                    |
|  - Deny-by-Default Context-Derived RBAC Authorization Matrix                      |
|  - Real-Time ConnectionManager (WebSocket pool, channel broadcasting, presence)   |
|  - Deterministic Business Rules Engine (Head Uniqueness, Conflict Detection)      |
|  - Risk Radar Scanner (Overdue deadlines, blocked dependencies, understaffing)    |
|  - LangGraph State Machine & Allowlisted Tool Calling Layer                       |
|  - Multi-Channel Dispatcher (Brevo Transactional Email + In-App Push)             |
|  - Cryptographic SHA-256 Audit Log Interceptor & Chain Verifier                   |
+--------------------+-------------------------------------+------------------------+
                     |                                     |
                     v                                     v
+------------------------------------+   +------------------------------------------+
|       PostgreSQL / SQLite DB       |   |             Groq AI Engine               |
| - 20 Relational Models             |   | - Ultra-low Latency Inference (<500ms)   |
| - Sequential Audit Hash Chains     |   | - Native Structured JSON Output Mode     |
| - Real-Time Chat Message Store     |   | - Staffing & Skill Count Decomposer      |
| - Full JSON State Mutation Diffs   |   | - Transcript Action Item Extractor       |
| - Task Dependency Graphs           |   | - Strategic Executive Advisor            |
+------------------------------------+   +------------------------------------------+
```

---

## Comprehensive Feature Matrix

| Domain | Core Capabilities | Underlying Technology |
|:---|:---|:---|
| **Context-Derived RBAC** | Deny-by-default access, club-scoped active roles, strict Club Head uniqueness | FastAPI, JWT (python-jose), SQLAlchemy |
| **Club & Member Governance** | Join requests, skill profiles, transfer leadership, membership rosters | PostgreSQL, Pydantic V2 |
| **Volunteer Matchmaking** | Skill tags, availability tracking, on-site check-in, workload scoring | Algorithmic Scorer + Groq AI |
| **AI Staffing & Event Planning** | Min volunteer calculator, skill-count breakdown, milestone generator | Groq API (`openai/gpt-oss-120b`) |
| **Visual Task Progression** | Kanban board, dependency resolution, automatic blocking, status patching | React Drag/Drop, State Machine |
| **Automated Notifications** | In-app alerts, unread badges, event created and task assigned dispatch | Async Event Dispatcher |
| **Meeting Parsing** | Unstructured transcript ingestion, action item extraction, 1-click task conversion | Groq Structured Extraction + Fallback |
| **Deterministic Risk Radar** | Overdue scanner, blocked dependency detection, understaffing alerts | Deterministic Rule Engine |
| **LangGraph Agent Workflows** | Multi-node state machine, allowlisted tool execution, human approval gate | LangGraph, `ClubOpsTools` |
| **Multi-Channel Announcements** | AI drafting, Brevo email broadcast, in-app push, category templates | Brevo Transactional API, Groq LLM |
| **Institutional Knowledge (RAG)** | Persistent FAISS vector database, 384-dim semantic embeddings, cosine similarity nearest neighbor search, grounded LLM synthesis with source citations | FAISS (`IndexFlatIP`), NumPy, Groq AI |
| **Role Dashboard Suite** | Strict role-isolated workspaces for President, Club Head, and Volunteer (zero cross-user view leakage) | React 19, Lucide Icons |
| **Real-Time Collaboration** | Full-duplex WebSocket gateway, chat channels, live presence, activity ticker | FastAPI WebSockets, `ConnectionManager` |
| **Operational Analytics** | Deterministic Health Score (0-100), Recharts cadence & velocity, CSV compliance | Recharts, NumPy-like Scoring Formula |
| **Cryptographic Audit Trail** | SHA-256 hash chaining, live mathematical tamper detection, SoD policy matrix | SHA-256 Engine, `/verify-integrity` |
| **Testing & Quality Assurance** | End-to-end integration workflow tests, 100% test pass rate | Pytest, TestClient, Vite Build |

---

## User Roles & Permissions

| Capability | President | Club Head | Volunteer | Member |
|:---|:---:|:---:|:---:|:---:|
| **Transfer Leadership / Manage Club** | ✅ | ❌ | ❌ | ❌ |
| **Approve / Reject Join Requests** | ✅ | ✅ | ❌ | ❌ |
| **Create Events & Approve AI Plans** | ✅ | ✅ | ❌ | ❌ |
| **Manage Department Tasks & Kanban** | ✅ | ✅ | ❌ | ❌ |
| **Update Own Assigned Task Status** | ✅ | ✅ | ✅ | ❌ |
| **Run Risk Radar Scan** | ✅ | ✅ | ❌ | ❌ |
| **Ingest Meetings & Convert Items** | ✅ | ✅ | ❌ | ❌ |
| **Publish Announcements & Email Broadcast** | ✅ | ✅ | ❌ | ❌ |
| **Real-Time Operations Chat** | ✅ | ✅ | ✅ | ✅ |
| **View Cryptographic Audit Chain & Verify** | ✅ | ❌ | ❌ | ❌ |

---

## Tech Stack

- **Frontend**: React 19, Vite, Tailwind CSS v4, React Router v7, Lucide Icons, Recharts.
- **Backend**: FastAPI, Pydantic V2, SQLAlchemy 2.0, Alembic, Uvicorn, WebSockets.
- **Vector Database**: FAISS (`IndexFlatIP`) with persistent disk serialization and L2-normalized 384-dimensional dense semantic embeddings.
- **Database**: PostgreSQL (production) or SQLite (development).
- **AI Intelligence**: Groq Cloud API (`openai/gpt-oss-120b`, `llama-3.3-70b-versatile`, with deterministic fallbacks).
- **Email Delivery**: Brevo (formerly Sendinblue) Transactional API.
- **Security**: Cryptographic SHA-256 hash chaining, JWT Bearer tokens, bcrypt password hashing.

---

## FAISS Vector Database & RAG Architecture

ClubOps AI features an institutional memory engine powered by **FAISS (Facebook AI Similarity Search)** for real-time dense semantic vector search:

1. **Sliding-Window Document Ingestion**:
   - Institutional memory docs (SOPs, budget guidelines, venue protocols) are segmented into overlapping semantic chunks (400 chars, 80-char stride).
2. **Deterministic 384-Dim Semantic Vector Space**:
   - Chunks are vectorized into 384-dimensional dense float32 embeddings with sublinear token weights, bigrams, and character trigrams, L2-normalized to unit vectors.
3. **Isolated Club Vector Indices**:
   - Vector indexes are isolated per club (`storage/faiss_indexes/{club_id}/`) and backed by `faiss.IndexFlatIP(384)`, ensuring dot-product calculations equal exact cosine similarity.
   - Indices and metadata are serialized directly to disk (`index.faiss` and `metadata.json`) for persistence across server restarts.
4. **Retrieval-Augmented Synthesis**:
   - Top-K nearest neighbors are retrieved from FAISS with exact similarity confidence scoring (`score * 100`).
   - Context is injected into Groq LLM prompts to synthesize hallucination-free answers citing exact document names and section titles.
5. **Dynamic Index Synchronization**:
   - When documents are deleted, FAISS vectors are purged and the index is dynamically re-trained/re-saved.

---

## Installation & Quickstart

### Prerequisites
- **Python 3.10+**
- **Node.js 18+** & `npm`
- **PostgreSQL** (optional, SQLite supported by default)
- **Groq API Key** (for live AI features; deterministic fallbacks work without API keys)

---

### Backend Setup

1. **Navigate to the backend directory**:
   ```bash
   cd backend
   ```

2. **Create and activate a virtual environment**:
   ```bash
   python -m venv venv
   # On Windows:
   .\venv\Scripts\activate
   # On macOS/Linux:
   source venv/bin/activate
   ```

3. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

4. **Configure environment variables**:
   Create a `.env` file in `backend/`:
   ```env
   DATABASE_URL=sqlite:///./clubops.db
   SECRET_KEY=clubops-development-secret-key-replace-in-production-2026!
   ACCESS_TOKEN_EXPIRE_MINUTES=1440
   GROQ_API_KEY=gsk_your_groq_api_key_here
   GROQ_MODEL=openai/gpt-oss-120b
   BREVO_API_KEY=your_brevo_api_key_here
   BREVO_SENDER_EMAIL=notifications@clubops.ai
   BREVO_SENDER_NAME=ClubOps AI Notifications
   ```

5. **Seed the database**:
   ```bash
   python -m app.database.seed
   ```

6. **Start the FastAPI server**:
   ```bash
   uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
   ```
   API Docs available at: `http://127.0.0.1:8000/docs`

---

### Frontend Setup

1. **Navigate to the frontend directory**:
   ```bash
   cd frontend
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure environment variables**:
   Create a `.env` file in `frontend/`:
   ```env
   VITE_API_BASE_URL=http://127.0.0.1:8000/api/v1
   VITE_WS_BASE_URL=ws://127.0.0.1:8000/api/v1
   ```

4. **Start the Vite development server**:
   ```bash
   npm run dev
   ```
   App accessible at: `http://localhost:5173`

---

## Seed Accounts for Evaluation

| Role | Email | Default Password |
|:---|:---|:---|
| **President** | `president@clubops.ai` | `ClubOps2026!` |
| **Club Head** | `organizer@clubops.ai` | `ClubOps2026!` |
| **Volunteer** | `volunteer@clubops.ai` | `ClubOps2026!` |
| **Club Member** | `member@clubops.ai` | `ClubOps2026!` |

---

## Verification & Testing

### Automated Backend Tests
Run the entire test suite (48 tests covering Auth, Clubs, Events, Tasks, Volunteers, AI Workflows, Announcements, Dashboards, Collaboration, Analytics, Audit Trail, and End-to-End master workflow):
```bash
cd backend
.\venv\Scripts\pytest.exe -q
```
Expected output:
```
48 passed in ~45s (100% pass rate)
```

Run only the master end-to-end operational workflow test:
```bash
.\venv\Scripts\pytest.exe tests/test_end_to_end_workflow.py -v
```

### Production Frontend Build
```bash
cd frontend
npm run build
```
Expected output:
```
✓ built in ~1.25s (0 errors)
```

---

## Documentation Directory

Deep technical documentation is organized in the `docs/` folder:

- [System Architecture](docs/architecture.md): 3-tier decoupling, WebSocket gateways, and service layers.
- [Security & Governance](docs/security.md): Deny-by-default RBAC, SHA-256 audit chaining, and SoD matrices.
- [Workflows & State Machines](docs/workflows.md): Operational lifecycles and LangGraph state machines.
- [API Contracts](docs/api-contracts.md): Request and response schemas for all 10 route groups.
- [Data Model & Schema](docs/data-model.md): Detailed ERD, table definitions, and index catalog.
- [LLM Architecture & Research](docs/llm-research.md): Groq model evaluations, latency benchmarks, and prompt designs.
- [AI Rules & Guardrails](docs/ai-rules.md): Strict boundaries, human-in-the-loop policies, and zero-SQL access rules.