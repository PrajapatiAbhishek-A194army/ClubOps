# API Contracts & Endpoints

## Base URL
`/api/v1`

## Standard Response Envelope
```json
{
  "success": true,
  "data": {},
  "error": null,
  "message": "Operation successful"
}
```

---

## Route Groups

### 1. Authentication (`/auth`)
- `POST /auth/register`: Register new user with email, password, full_name, and phone.
- `POST /auth/login`: Authenticate credentials, return JWT access token and user metadata.
- `GET /auth/me`: Retrieve current authenticated profile and club memberships.

### 2. Clubs & Governance (`/clubs`)
- `GET /clubs`: List accessible clubs.
- `POST /clubs`: Create a new club (President role).
- `GET /clubs/{id}`: Detailed club record with active Club Head and metrics.
- `PATCH /clubs/{id}`: Update club profile or assign/transfer active Club Head.
- `GET /clubs/{id}/members`: List all members and their roles.
- `POST /clubs/{id}/join-requests`: Volunteer requests to join club.
- `GET /clubs/{id}/join-requests`: Club Head views pending requests.
- `PATCH /clubs/{id}/join-requests/{request_id}`: Approve or reject join request.

### 3. Events & Staffing (`/events`)
- `GET /events`: List club events.
- `POST /events`: Create event. Club Head inputs scope; triggers AI staffing estimator.
- `GET /events/{id}`: Event details with timeline, staffing requirements, and progress.
- `POST /events/{id}/ai-plan`: Generate/regenerate AI staffing breakdown (min volunteers required, skill counts, task proposals).
- `POST /events/{id}/approve-plan`: Club Head approves AI plan; converts into tasks and dispatches event/task notifications.

### 4. Tasks & Progression Board (`/tasks`)
- `GET /tasks`: List tasks with filtering by event, status (`TODO`, `IN_PROGRESS`, `BLOCKED`, `COMPLETED`), and assignee.
- `GET /tasks/board`: Grouped task board for visual Kanban representation.
- `POST /tasks`: Create manual task.
- `PATCH /tasks/{id}`: Update task status, priority, or deadline.
- `GET /tasks/{id}/candidates`: Fetch eligible volunteers ranked by skill match, availability, and workload.
- `POST /tasks/{id}/assign`: Assign volunteer to task; dispatches task assignment notification.

### 5. Notifications (`/notifications`)
- `GET /notifications`: Retrieve current user's notifications (supports `unread_only=true`).
- `PATCH /notifications/{id}/read`: Mark notification as read.
- `POST /notifications/read-all`: Mark all user notifications as read.
- `GET /notifications/unread-count`: Returns active unread badge count.

### 6. Meetings & Extraction (`/meetings`)
- `POST /meetings`: Ingest meeting transcript or raw notes.
- `POST /meetings/{id}/extract`: Trigger AI action item extraction.
- `GET /meetings/{id}/action-items`: List extracted action items.
- `POST /meetings/{id}/convert-items`: Convert approved action items into tasks.

### 7. Risks Radar (`/risks`)
- `GET /risks`: List detected risks filtered by event and severity.
- `POST /risks/scan`: Trigger deterministic risk radar scan; emits notifications for critical risks.
- `PATCH /risks/{id}/resolve`: Mark risk as resolved or mitigated.

### 8. Documents & RAG Knowledge (`/knowledge`)
- `POST /knowledge/upload`: Ingest PDF or document report; chunk and index text.
- `POST /knowledge/search`: Natural language semantic search returning answers with source citations.

### 9. Announcements (`/announcements`)
- `POST /announcements/draft`: AI generates targeted announcement draft.
- `POST /announcements/publish`: Club Head publishes announcement and triggers broadcast.
