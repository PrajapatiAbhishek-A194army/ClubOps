# Data Model & Schema Specifications

## 1. Entity-Relationship Overview

ClubOps AI manages 19 core and supporting entities that form an auditable, constraint-enforced relational schema:

```
                  +-------------------+
                  |       User        |
                  +-------------------+
                    | 1           | 1
                    |             +----------------------------------+
                    | N                                              | N
            +-------------------+                             +-------------------+
            |  ClubMembership   |                             |    Availability   |
            +-------------------+                             +-------------------+
                    | N                                              |
                    | 1                                              |
            +-------------------+                                    |
            |       Club        |                                    |
            +-------------------+                                    |
              | 1           | 1                                      |
              |             |                                        |
              | N           | N                                      |
       +-------------+  +---------------+                            |
       | JoinRequest |  |     Event     |                            |
       +-------------+  +---------------+                            |
                          | 1         | 1                            |
                          |           |                              |
                          | N         | N                            |
                  +-------------+  +-------------+                   |
                  | EventMember |  |    Task     |                   |
                  +-------------+  +-------------+                   |
                                          | 1                        |
                                          | N                        |
                                   +----------------+                |
                                   | TaskAssignment | <--------------+
                                   +----------------+
```

---

## 2. Detailed Entity Catalog

### 1. User
Global system user. Roles are NOT permanently stored on the User record.
- `id`: UUID (String 36), Primary Key
- `email`: String (255), Unique, Indexed
- `hashed_password`: String (255), Nullable=False
- `full_name`: String (120), Nullable=False
- `phone_number`: String (30), Nullable=True
- `avatar_url`: String (500), Nullable=True
- `is_active`: Boolean, Default=True
- `created_at`: DateTime
- `updated_at`: DateTime

### 2. Club
The student organization tenant.
- `id`: UUID (String 36), Primary Key
- `name`: String (150), Unique, Indexed
- `code`: String (50), Unique, Indexed
- `description`: Text, Nullable=True
- `institution`: String (200), Default="University Campus"
- `status`: Enum (`ACTIVE`, `INACTIVE`, `ARCHIVED`), Default=`ACTIVE`
- `created_by_id`: Foreign Key -> `User.id`
- `created_at`, `updated_at`: DateTime

### 3. ClubMembership
Associates a User with a Club under an organizational role.
- `id`: UUID (String 36), Primary Key
- `club_id`: Foreign Key -> `Club.id`
- `user_id`: Foreign Key -> `User.id`
- `role`: Enum (`PRESIDENT`, `CLUB_HEAD`, `VOLUNTEER`)
- `status`: Enum (`ACTIVE`, `INACTIVE`, `SUSPENDED`), Default=`ACTIVE`
- `joined_at`: DateTime
> **Hard Rule:** A club can have at most **ONE active Club Head** (`role=CLUB_HEAD` and `status=ACTIVE`).

### 4. JoinRequest
Tracks volunteer applications to join a club.
- `id`: UUID (String 36), Primary Key
- `club_id`: Foreign Key -> `Club.id`
- `user_id`: Foreign Key -> `User.id`
- `status`: Enum (`PENDING`, `APPROVED`, `REJECTED`, `CANCELLED`), Default=`PENDING`
- `message`: Text, Nullable=True
- `requested_at`: DateTime
- `reviewed_at`: DateTime, Nullable=True
- `reviewed_by_id`: Foreign Key -> `User.id`, Nullable=True

### 5. Skill
Master catalog of standardized skills.
- `id`: UUID (String 36), Primary Key
- `name`: String (100), Unique, Indexed (e.g. "Power BI", "Python", "Audio/Visual", "Logistics")
- `category`: String (80) (e.g., "Technical", "Operations", "Design", "Media")
- `description`: Text, Nullable=True

### 6. VolunteerSkill
Relates a volunteer user to specific skills with structured ratings.
- `id`: UUID (String 36), Primary Key
- `user_id`: Foreign Key -> `User.id`
- `skill_id`: Foreign Key -> `Skill.id`
- `proficiency`: Integer (1 to 5)
- `experience_years`: Float, Default=0.0

### 7. Event
An organized club activity with dates and staffing requirements.
- `id`: UUID (String 36), Primary Key
- `club_id`: Foreign Key -> `Club.id`
- `title`: String (200), Nullable=False
- `slug`: String (220), Indexed
- `description`: Text, Nullable=True
- `location`: String (255), Default="Campus Auditorium"
- `event_type`: Enum (`WORKSHOP`, `HACKATHON`, `SEMINAR`, `EXPO`, `CULTURAL`, `MEETING`, `OTHER`)
- `status`: Enum (`DRAFT`, `PLANNED`, `ONGOING`, `COMPLETED`, `CANCELLED`), Default=`DRAFT`
- `start_date`: DateTime, Nullable=False
- `end_date`: DateTime, Nullable=False
- `budget`: Float, Default=0.0
- `min_volunteers_required`: Integer, Default=1
- `skill_requirements`: JSON (List of `{"skill_name": "Power BI", "required_count": 3, "assigned_count": 1}`)
- `created_by_id`: Foreign Key -> `User.id`
- `created_at`, `updated_at`: DateTime

### 8. EventMember
Roster of participants in an event.
- `id`: UUID (String 36), Primary Key
- `event_id`: Foreign Key -> `Event.id`
- `user_id`: Foreign Key -> `User.id`
- `role`: Enum (`EVENT_COORDINATOR`, `VOLUNTEER`), Default=`VOLUNTEER`
- `status`: Enum (`CONFIRMED`, `INVITED`, `DECLINED`), Default=`CONFIRMED`
- `joined_at`: DateTime

### 9. Availability
Defines volunteer time windows.
- `id`: UUID (String 36), Primary Key
- `user_id`: Foreign Key -> `User.id`
- `start_datetime`: DateTime
- `end_datetime`: DateTime
- `status`: Enum (`AVAILABLE`, `UNAVAILABLE`), Default=`AVAILABLE`

### 10. Task
Individual unit of work belonging to an event.
- `id`: UUID (String 36), Primary Key
- `club_id`: Foreign Key -> `Club.id`
- `event_id`: Foreign Key -> `Event.id`
- `title`: String (255), Nullable=False
- `description`: Text, Nullable=True
- `priority`: Enum (`LOW`, `MEDIUM`, `HIGH`, `CRITICAL`), Default=`MEDIUM`
- `status`: Enum (`TODO`, `IN_PROGRESS`, `BLOCKED`, `COMPLETED`, `CANCELLED`), Default=`TODO`
- `due_datetime`: DateTime, Nullable=True
- `required_skill_id`: Foreign Key -> `Skill.id`, Nullable=True
- `created_by_id`: Foreign Key -> `User.id`
- `created_source`: Enum (`MANUAL`, `AI`, `MEETING`), Default=`MANUAL`
- `parent_task_id`: Foreign Key -> `Task.id`, Nullable=True
- `depends_on_task_id`: Foreign Key -> `Task.id`, Nullable=True
- `created_at`, `updated_at`: DateTime

### 11. TaskAssignment
Auditable record of a task assigned to a volunteer.
- `id`: UUID (String 36), Primary Key
- `task_id`: Foreign Key -> `Task.id`
- `user_id`: Foreign Key -> `User.id`
- `assigned_by_id`: Foreign Key -> `User.id`
- `assignment_source`: Enum (`MANUAL`, `AI_RECOMMENDED`, `AI_APPROVED`), Default=`MANUAL`
- `status`: Enum (`ASSIGNED`, `ACCEPTED`, `COMPLETED`, `REVOKED`), Default=`ASSIGNED`
- `assigned_at`: DateTime
- `completed_at`: DateTime, Nullable=True

### 12. Meeting
Meeting record with transcript and notes.
- `id`: UUID (String 36), Primary Key
- `club_id`: Foreign Key -> `Club.id`
- `event_id`: Foreign Key -> `Event.id`, Nullable=True
- `title`: String (200), Nullable=False
- `transcript_text`: Text, Nullable=False
- `meeting_date`: DateTime
- `processed_at`: DateTime, Nullable=True
- `created_by_id`: Foreign Key -> `User.id`

### 13. ActionItem
Atomic action extracted from a meeting.
- `id`: UUID (String 36), Primary Key
- `meeting_id`: Foreign Key -> `Meeting.id`
- `title`: String (255), Nullable=False
- `description`: Text, Nullable=True
- `suggested_owner`: String (120), Nullable=True
- `suggested_deadline`: DateTime, Nullable=True
- `confidence_score`: Float, Default=0.0
- `status`: Enum (`EXTRACTED`, `CONFIRMED`, `REJECTED`, `CONVERTED`), Default=`EXTRACTED`
- `created_task_id`: Foreign Key -> `Task.id`, Nullable=True

### 14. Document
Uploaded institutional document or past report.
- `id`: UUID (String 36), Primary Key
- `club_id`: Foreign Key -> `Club.id`
- `event_id`: Foreign Key -> `Event.id`, Nullable=True
- `name`: String (255), Nullable=False
- `file_path`: String (500), Nullable=False
- `file_type`: String (50), Nullable=False
- `uploaded_by_id`: Foreign Key -> `User.id`
- `created_at`: DateTime

### 15. DocumentChunk
Vectorized chunk of an institutional document.
- `id`: UUID (String 36), Primary Key
- `document_id`: Foreign Key -> `Document.id`
- `chunk_text`: Text, Nullable=False
- `chunk_index`: Integer
- `embedding_json`: Text / JSON, Nullable=True

### 16. Risk
Detected operational risk.
- `id`: UUID (String 36), Primary Key
- `event_id`: Foreign Key -> `Event.id`
- `related_task_id`: Foreign Key -> `Task.id`, Nullable=True
- `title`: String (255), Nullable=False
- `description`: Text, Nullable=False
- `severity`: Enum (`LOW`, `MEDIUM`, `HIGH`, `CRITICAL`), Default=`MEDIUM`
- `status`: Enum (`OPEN`, `MITIGATED`, `RESOLVED`), Default=`OPEN`
- `source`: Enum (`MANUAL`, `RULE_ENGINE`, `AI`), Default=`RULE_ENGINE`
- `detected_at`: DateTime
- `resolved_at`: DateTime, Nullable=True

### 17. Announcement
Broadcast communications to club members.
- `id`: UUID (String 36), Primary Key
- `club_id`: Foreign Key -> `Club.id`
- `event_id`: Foreign Key -> `Event.id`, Nullable=True
- `title`: String (255), Nullable=False
- `content`: Text, Nullable=False
- `created_by_id`: Foreign Key -> `User.id`
- `created_source`: Enum (`MANUAL`, `AI_DRAFTED`), Default=`MANUAL`
- `status`: Enum (`DRAFT`, `PUBLISHED`), Default=`DRAFT`
- `published_at`: DateTime, Nullable=True

### 18. Notification
Multi-channel notification alerts.
- `id`: UUID (String 36), Primary Key
- `user_id`: Foreign Key -> `User.id`
- `title`: String (255), Nullable=False
- `message`: Text, Nullable=False
- `type`: Enum (`EVENT_CREATED`, `TASK_ASSIGNED`, `RISK_ALERT`, `SYSTEM`)
- `is_read`: Boolean, Default=False
- `link_url`: String (255), Nullable=True
- `created_at`: DateTime

### 19. AuditLog
Tamper-resistant audit trail.
- `id`: UUID (String 36), Primary Key
- `actor_user_id`: Foreign Key -> `User.id`, Nullable=True
- `action`: String (100), Nullable=False
- `entity_type`: String (50), Nullable=False
- `entity_id`: String (36), Nullable=False
- `source`: Enum (`HUMAN`, `AI`, `RULE_ENGINE`)
- `metadata_json`: JSON, Default=dict
- `created_at`: DateTime
