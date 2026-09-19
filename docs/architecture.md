# System Architecture & Technical Specifications

## 1. System Overview

ClubOps AI is architected following the core product principle:
> **HUMAN AUTHORITY + DETERMINISTIC CONSTRAINTS + AI INTELLIGENCE + CONTROLLED ACTIONS**

The platform decouples into three enterprise-grade tiers:
1. **Frontend Presentation**: Single-Page Application (SPA) built with React 19, Vite, and Tailwind CSS. Provides role-tailored workspaces for Presidents, Club Heads, and Volunteers, complete with Kanban task tracking, an AI Staffing & Skill Breakdown modal, a real-time Notification Center, and interactive dashboards.
2. **Backend Services & Orchestration**: FastAPI (Python 3.10+) service layer with SQLAlchemy 2.0 ORM, JWT-based role authorization, deterministic constraint validators, transactional mutations, and an immutable audit log engine.
3. **AI Reasoning & Tool Layer**: Structured agent pipelines with provider abstraction (Groq / OpenAI / Mock). The AI models structured club and event state, performs staffing and skill-count calculations, and executes state changes strictly through allowlisted backend tools.

```
+-----------------------------------------------------------------------------------+
|                              React + Vite Frontend                                |
|  - Role Dashboards (President, Club Head, Volunteer)                              |
|  - Visual Kanban Progression (TODO, IN_PROGRESS, BLOCKED, COMPLETED)              |
|  - Event Creator with AI Staffing & Skill Breakdown (Min Count, Skill Counts)     |
|  - Real-Time Notification Center (Event Alert, Task Alert, Risk Radar)            |
|  - Meeting Parser & RAG Knowledge Explorer                                       |
+------------------------------------------+----------------------------------------+
                                           | HTTPS / REST (JWT Auth)
                                           v
+-----------------------------------------------------------------------------------+
|                                 FastAPI Backend                                   |
|  - Auth & RBAC Security Boundary (ClubMembership role derivation)                |
|  - Deterministic Business Rules Engine (Head Uniqueness, Conflict Checking)       |
|  - Automated Notification Dispatcher (In-app DB + Email / Webhook logger)        |
|  - Risk Detection Radar (Deterministic State Scan + AI Explanations)              |
|  - Immutable Audit Log Interceptor                                                |
+--------------------+-------------------------------------+------------------------+
                     |                                     |
                     v                                     v
+------------------------------------+   +------------------------------------------+
|       PostgreSQL / SQLite DB       |   |             AI Service Layer             |
| - 19 Core Entities & Constraints   |   | - Provider Abstraction (Groq / OpenAI)   |
| - Audit Logs & Vector Embeddings   |   | - Event Planning & Staffing Agent        |
| - Notification Records             |   | - Meeting Extraction Agent               |
| - Multi-Event Rosters              |   | - Explainable Assignment Recommender     |
+------------------------------------+   +------------------------------------------+
```

---

## 2. Core Subsystems

### A. Event Planning & Staffing Estimator Subsystem
When a Club Head creates an event:
1. AI analyzes the event title, description, category, dates, and expected scale.
2. AI calculates the **minimum number of volunteers required**.
3. AI computes the **count of volunteers required with particular skills** (e.g., Audio/Visual: 2, Power BI: 3, Event Management: 2, Logistics: 2).
4. AI decomposes the event into milestone tasks and maps candidate volunteers from the club membership who possess the requisite skills and availability, with zero schedule overlaps.
5. The Club Head reviews, adjusts, and approves the proposal before tasks and assignments are created in the database.

### B. Multi-Channel Notification Subsystem
The notification dispatcher guarantees that participants stay informed throughout operations:
1. **Event Created**: Automatically sends in-app notifications and email alerts to active club volunteers with event details and suggested roles.
2. **Task Assigned**: Sends an instant alert to the assigned volunteer including title, priority, deadline, and instructions.
3. **Risk Alert**: Alerts Club Heads, Presidents, and assignees when critical risks (e.g., overdue tasks, blocking dependencies, staffing shortages) are identified.

### C. Visual Task Progression Subsystem
Tasks transition transparently through four Kanban states:
- `TODO`: Pending commencement.
- `IN_PROGRESS`: Actively underway.
- `BLOCKED`: Impeded by dependencies, missing approvals, or critical risks.
- `COMPLETED`: Finished and verified deliverables.
Real-time metrics calculate event health, task completion percentages, and volunteer workload distribution.

### D. Security & Deterministic Execution Boundary
The AI never executes raw database queries. All actions flow through:
`LLM -> Tool Signature -> Parameter Validation -> Permission Check -> Business Rules -> DB Transaction -> Audit Log -> Response`.
If conditions change between recommendation and approval, the backend deterministically revalidates eligibility before committing.
