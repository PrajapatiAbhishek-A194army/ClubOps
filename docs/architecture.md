# System Architecture

## Overview

ClubOps AI is architected with a strict 3-tier decoupling model:
1. **Frontend Presentation**: Single-page application built on React, Vite, and Tailwind CSS.
2. **Backend Services & Orchestration**: High-performance FastAPI server running Python 3.10 with SQLAlchemy 2.0 ORM, Alembic migrations, and JWT security.
3. **AI Workflow Layer**: LangChain / LangGraph orchestration utilizing Groq for high-speed inference, strictly mediated by backend tools.

```
+--------------------------------------------------------+
|                React + Vite Frontend                   |
|   (Green & White Aesthetic, Role-Based Dashboards)     |
+---------------------------+----------------------------+
                            | HTTP / WebSocket
                            v
+--------------------------------------------------------+
|                   FastAPI Backend                      |
|  - API Router (/api/v1)                                |
|  - JWT Authentication & RBAC                           |
|  - Business Services Layer                             |
|  - Tool Calling Security Boundary                      |
+-------------+---------------------------+--------------+
              |                           |
              v                           v
+---------------------------+ +--------------------------+
|  PostgreSQL / SQLAlchemy  | | LangGraph + Groq LLM     |
|  - Clubs, Users, Events   | | - Event Plan Generator   |
|  - Tasks, Volunteers      | | - Meeting Parser         |
|  - Meetings, Risks, Audit | | - Risk Analyzer          |
+---------------------------+ +--------------------------+
```

## AI Security Boundary
The AI layer never executes raw database queries. All interactions must be channeled through allowlisted backend tools with parameterized validation and permission checks.
