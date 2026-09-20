# API Contracts & Endpoint Specifications

Base URL: `/api/v1`

All responses follow the standard JSON envelope:
```json
{
  "success": true,
  "data": {},
  "error": null,
  "message": "Operation completed successfully"
}
```

---

## 1. Authentication (`/auth`)

### `POST /auth/register`
- **Description**: Registers a new campus user account.
- **Request Body**:
  ```json
  {
    "email": "student@university.edu",
    "password": "SecurePassword123!",
    "full_name": "Jane Doe",
    "phone": "+1-555-0199"
  }
  ```
- **Response**: User summary with ID and email.

### `POST /auth/login`
- **Description**: Authenticates user credentials and returns JWT bearer token.
- **Request Body**:
  ```json
  {
    "email": "student@university.edu",
    "password": "SecurePassword123!"
  }
  ```
- **Response**:
  ```json
  {
    "access_token": "eyJhbGciOiJIUzI1NiIs...",
    "token_type": "bearer",
    "user": { "id": "...", "email": "...", "full_name": "..." }
  }
  ```

### `GET /auth/me`
- **Description**: Returns authenticated user profile and associated club memberships.

---

## 2. Clubs & Governance (`/clubs`)

### `GET /clubs`
- Lists all clubs accessible to the authenticated user.

### `POST /clubs`
- Creates a new campus organization (Requires Superuser or President permissions).

### `GET /clubs/{club_id}`
- Detailed club profile, active member count, and current leadership.

### `GET /clubs/{club_id}/members`
- Lists all roster members, assigned roles, and departments.

### `POST /clubs/{club_id}/join-requests`
- Submits a request to join the club.

### `PATCH /clubs/{club_id}/join-requests/{request_id}`
- Approves or rejects a membership request (`status: "APPROVED" | "REJECTED"`).

---

## 3. Events (`/clubs/{club_id}/events`)

### `GET /clubs/{club_id}/events`
- Lists events for the specified club. Supports filtering by `status`.

### `POST /clubs/{club_id}/events`
- Creates an event draft.
- **Request Body**:
  ```json
  {
    "title": "AI & Robotics Showcase",
    "description": "Annual student technology demonstration",
    "event_type": "HACKATHON",
    "start_date": "2026-10-15T09:00:00Z",
    "end_date": "2026-10-16T18:00:00Z",
    "location": "Main Auditorium",
    "budget": 3500.00
  }
  ```

### `GET /clubs/{club_id}/events/{event_id}`
- Returns full event details including staffing breakdown, milestone tasks, and progress.

---

## 4. Tasks & Progression Board (`/clubs/{club_id}/tasks`)

### `GET /clubs/{club_id}/tasks`
- Lists all club tasks. Supports filters: `event_id`, `status`, `assignee_id`.

### `POST /clubs/{club_id}/tasks`
- Creates a task manually or linked to an event.
- **Request Body**:
  ```json
  {
    "title": "Stage AV Setup & Projector Calibration",
    "description": "Configure dual video projectors and wireless microphones",
    "priority": "HIGH",
    "status": "TODO",
    "deadline": "2026-10-14T17:00:00Z",
    "event_id": "optional-event-uuid"
  }
  ```

### `PATCH /clubs/{club_id}/tasks/{task_id}/status`
- Transitions task status through Kanban states (`TODO`, `IN_PROGRESS`, `DONE`, `BLOCKED`).
- Automatically resolves or asserts upstream dependency blockers.

---

## 5. Volunteers & Matchmaking (`/clubs/{club_id}/volunteers`)

### `GET /clubs/{club_id}/volunteers`
- Lists volunteer roster with skills, availability status, active task count, and check-in state.

### `POST /clubs/{club_id}/volunteers/ai-match`
- Recommends best-fit volunteers for a given task based on skills, availability, and active workload.

### `PATCH /clubs/{club_id}/volunteers/{volunteer_id}/availability`
- Updates volunteer availability state (`AVAILABLE`, `BUSY`, `UNAVAILABLE`).

### `PATCH /clubs/{club_id}/volunteers/{volunteer_id}/check-in`
- Toggles on-site attendance (`CHECKED_IN`, `NOT_CHECKED_IN`).

---

## 6. Multi-Channel Announcements (`/clubs/{club_id}/announcements`)

### `POST /clubs/{club_id}/announcements/generate-ai`
- Uses Groq LLM to generate formatted announcement drafts.
- **Request Body**:
  ```json
  {
    "category": "VENUE_UPDATE",
    "tone": "PROFESSIONAL",
    "target_channel": "EMAIL",
    "custom_notes": "Room 402 AC repaired, workshop starts on time."
  }
  ```

### `POST /clubs/{club_id}/announcements`
- Creates an announcement record (`status: "DRAFT"`).

### `POST /clubs/{club_id}/announcements/{id}/publish`
- Publishes notice, creates in-app member notifications, and dispatches Brevo transactional email broadcast.

---

## 7. Role Dashboards (`/clubs/{club_id}/dashboard`)

### `GET /clubs/{club_id}/dashboard?perspective={ROLE}`
- Returns role-customized operational metrics:
  - `PRESIDENT`: High-level governance, club health, risk overview.
  - `CLUB_HEAD`: Today's tasks, volunteer shifts, pending announcements.
  - `VOLUNTEER`: Personal task assignments, shift times, check-in status.

---

## 8. Real-Time Collaboration (`/clubs/{club_id}/ws`, `/collaboration`)

### `WebSocket /api/v1/clubs/{club_id}/ws?token={JWT}`
- Full-duplex WebSocket gateway. Supports live chat broadcasting, online presence detection, and instant operational activity ticker alerts.

### `POST /clubs/{club_id}/collaboration/messages`
- Sends REST-based message to a channel (`#general`, `#operations`, `#emergencies`, `#announcements`).

### `GET /clubs/{club_id}/collaboration/messages?channel={name}`
- Retrieves message history for the specified channel.

---

## 9. Operational Analytics (`/clubs/{club_id}/analytics`)

### `GET /clubs/{club_id}/analytics/overview`
- Computes deterministic Club Health Score (0–100), task completion velocity, event delivery cadence, and volunteer leaderboard.

### `POST /clubs/{club_id}/analytics/ai-insights`
- Groq-powered AI strategic advisor synthesizing recommendations from active metrics.

### `GET /clubs/{club_id}/analytics/compliance-export`
- Exports CSV compliance ledger of completed tasks, attendance records, and verified audits.

---

## 10. Cryptographic Audit & Governance (`/clubs/{club_id}/audit`)

### `GET /clubs/{club_id}/audit?limit=50&result=SUCCESS`
- Fetches paginated immutable audit logs.

### `GET /clubs/{club_id}/audit/verify-integrity`
- Validates the entire mathematical SHA-256 hash chain from Genesis to head, detecting any unauthorized state tampering.

### `GET /clubs/{club_id}/audit/governance`
- Returns active Separation of Duties (SoD) enforcement rules and security policies.
