# Data Model & Schema Specifications

## Core Entities & Relationships

```
+---------------+        1:N         +---------------+
|     Clubs     | -----------------> |     Users     |
+---------------+                    +---------------+
        | 1:N                                | 1:N
        v                                    v
+---------------+        1:N         +---------------+
|    Events     | -----------------> |     Tasks     |
+---------------+                    +---------------+
        | 1:N                                |
        v                                    v
+---------------+                    +---------------+
|   Meetings    |                    | TaskDependency|
+---------------+                    +---------------+
        | 1:N                                |
        v                                    v
+---------------+                    +---------------+
|   Documents   |                    |     Risks     |
+---------------+                    +---------------+
```

## Entity Highlights
- **Club**: Tenant identifier with institution details.
- **User**: System user with role enum (`PRESIDENT`, `ORGANIZER`, `TEAM_LEAD`, `VOLUNTEER`, `MEMBER`).
- **Event**: Core operational unit with date range, budget, location, status.
- **Task**: Granular unit with status (`TODO`, `IN_PROGRESS`, `DONE`), priority (`LOW`, `MEDIUM`, `HIGH`, `CRITICAL`), deadlines, and owner assignment.
- **VolunteerProfile**: Skills tags, availability calendar, and ratings.
- **Meeting**: Raw transcript/notes and structured extraction JSON.
- **Document**: Metadata and vector index reference for RAG.
- **Risk**: Detected anomalies with severity, category, and suggested mitigation.
- **AuditLog**: Immutable action log with actor, timestamp, and diffs.
