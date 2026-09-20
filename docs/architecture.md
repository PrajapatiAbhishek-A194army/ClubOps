# System Architecture & Technical Specifications

## 1. Architectural Philosophy

ClubOps AI is built around the foundational principle:
> **HUMAN AUTHORITY + DETERMINISTIC CONSTRAINTS + AI INTELLIGENCE + CONTROLLED ACTIONS**

The platform decouples into three enterprise-grade tiers:
1. **Frontend Presentation Tier**: Modern React 19 Single-Page Application (SPA) powered by Vite, Tailwind CSS v4, Lucide Icons, and Recharts. Features strict role-isolated workspaces (President Executive Console, Club Head Operations Dashboard, Volunteer Squad Dashboard with zero cross-role leakage), interactive Kanban task progression boards, WebSocket-powered operations chat, real-time activity tickers, and audit verifiers.
2. **Backend Services & Orchestration Tier**: High-performance FastAPI (Python 3.10+) service layer with SQLAlchemy 2.0 ORM, context-derived JWT role authorization, deterministic constraint validators, transactional mutations, and an immutable cryptographic audit log engine.
3. **AI Intelligence & Tool-Calling Tier**: Structured agent pipelines leveraging the Groq API (`openai/gpt-oss-120b`, `llama-3.3-70b-versatile`, with graceful deterministic fallbacks). The AI decomposes event milestones, calculates volunteer staffing ratios, parses unstructured meeting transcripts, and crafts targeted multi-channel announcements.

```
+-----------------------------------------------------------------------------------+
|                             React 19 + Vite Frontend                              |
|  - Strict Role-Isolated Workspaces (President, Club Head, Volunteer)             |
|  - Visual Kanban Task Progression Board (TODO, IN_PROGRESS, DONE, BLOCKED)        |
|  - Real-Time Collaboration Gateway (Full-Duplex WebSockets, Chat Channels)        |
|  - Event Creator with AI Staffing & Skill Breakdown Modal                         |
|  - Operational Analytics Suite (Deterministic Club Health Score 0-100, Recharts)  |
|  - Cryptographic Audit Trail Explorer & Live SHA-256 Integrity Verifier           |
+------------------------------------------+----------------------------------------+
                                           | HTTPS / WSS (JWT Auth)
                                           v
+-----------------------------------------------------------------------------------+
|                                FastAPI Backend                                    |
|  - Auth & RBAC Security Boundary (Context-derived club membership resolution)     |
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
| - 15+ Relational Models            |   | - Low-latency LLM Inference              |
| - Sequential Audit Hash Chains     |   | - Structured JSON Output Mode            |
| - Real-Time Chat Message Store     |   | - Staffing & Skill Count Decomposer      |
| - Full JSON State Mutation Diffs   |   | - Transcript Action Item Extractor       |
| - Task Dependency Graphs           |   | - Strategic Executive Advisor            |
+------------------------------------+   +------------------------------------------+
```

---

## 2. Core Subsystems

### A. Real-Time Collaboration & WebSockets Gateway
- **Endpoint**: `/api/v1/clubs/{club_id}/ws`
- **ConnectionManager**: Tracks active WebSocket clients per club, managing channel subscriptions (`#general`, `#operations`, `#emergencies`, `#announcements`).
- **Heartbeat & Presence**: Periodic ping/pong frames track online user presence.
- **Activity Ticker**: Broadcasts instant notifications when tasks are moved, risks are detected, or announcements are published.

### B. Event Planning & AI Staffing Estimator
- Analyzes event scale, category, date duration, and location.
- Calculates **minimum volunteers required** based on departmental coverage.
- Decomposes requirements into concrete **skill-count quotas** (e.g. AV Testing: 2, Cloud: 3, Logistics: 2).
- Automatically proposes initial milestone tasks with deadlines and dependency links.

### C. Visual Task Progression & Kanban Subsystem
- Four distinct operational stages: `TODO`, `IN_PROGRESS`, `DONE`, and `BLOCKED`.
- **Dependency Guard**: Tasks with incomplete prerequisites are automatically marked `is_blocked = True` with human-readable blocking reasons.
- Status patches dynamically unblock dependent downstream tasks when prerequisites reach `DONE`.

### D. Multi-Channel Announcement & Notification Dispatcher
- AI generation creates formatted announcements tailored to target channels (`EMAIL`, `IN_APP`, `WHATSAPP`, `PORTAL`).
- Multi-channel delivery engine integrates with **Brevo API** for live email notifications and persists in-app notification records for club members.

### E. Deterministic Risk Radar & Club Health Analytics
- **Risk Radar**: Scans for overdue tasks, circular dependencies, unassigned critical tasks, and understaffed event roles without relying on unpredictable LLM calls.
- **Club Health Score**: Deterministic 0–100 score computed across 4 dimensions:
  1. *Task Velocity & Completion Rate* (35%)
  2. *Event Delivery Cadence* (25%)
  3. *Risk Mitigation Index* (25%)
  4. *Volunteer Engagement & Availability* (15%)

### F. Cryptographic SHA-256 Audit Engine
- Intercepts state changes across all operational domains.
- Maintains a continuous, unbroken cryptographic hash chain linking each action to the prior block.
- Delivers instantaneous tamper detection through full mathematical chain traversal.
