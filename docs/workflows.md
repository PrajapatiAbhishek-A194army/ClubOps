# Workflows, State Machines & Lifecycles

## 1. Event Creation & AI Staffing Estimator Workflow

When a Club Head initiates an event, the system transitions from unstructured intent into verifiable operational structure:

```
[ Event Form Submitted ]
          ↓
[ Event Draft Persisted in Database ]
          ↓
[ AI Staffing Agent Decomposes Scope ]
          ↓
[ Generates:
  - Minimum Volunteers Required (e.g. 8)
  - Skill Count Breakdown (e.g. 3 Power BI, 2 Audio/Visual, 2 Logistics)
  - Milestone Tasks with Deadlines ]
          ↓
[ Deterministic Constraint Engine Matches Candidates ]
  - Checks Club Membership & Event Roster
  - Filters by Skill & Proficiency
  - Verifies Calendar Availability
  - Enforces Zero Scheduling Overlaps & Workload Limits
          ↓
[ Club Head Reviews & Adjusts Recommendations ]
          ↓
[ APPROVAL BY CLUB HEAD ]
          ↓
[ Database Transaction Commits Tasks & TaskAssignments ]
          ↓
[ Notification Dispatcher Triggers:
  1. Event Created Notification to all Club Volunteers
  2. Task Assigned Notification to each Assigned Volunteer ]
          ↓
[ Event Status Transitions to PLANNED ]
```

---

## 2. Visual Task Progression & Kanban Workflow

Tasks advance visibly through four standard states:

```
+------------+       Start Work       +-----------------+
|    TODO    | ---------------------> |   IN_PROGRESS   |
+------------+                        +-----------------+
      |                                        |
      | Blocked by Dep / Risk                  | Deliverable Completed
      v                                        v
+------------+                        +-----------------+
|  BLOCKED   | <--------------------- |    COMPLETED    |
+------------+   Dependency Re-opened +-----------------+
```

- **TODO**: Task registered with assigned volunteer and due date. Volunteer receives an in-app and email alert.
- **IN_PROGRESS**: Volunteer marks work as active. Dashboard computes active workload load.
- **BLOCKED**: Automatically flagged if an upstream dependency is incomplete or high-severity risk is registered.
- **COMPLETED**: Volunteer or Club Head verifies completion. Clears downstream dependencies and updates overall event completion percentage.

---

## 3. Automated Notification Lifecycle

```
Event / Task / Risk Trigger
           ↓
[ Notification Service Interceptor ]
           ↓
[ Determine Target Audience ]
  ├── Event Created  → All active volunteers in club
  ├── Task Assigned  → Individual assigned volunteer
  └── Risk Detected  → Club Head, President, and Task Assignee
           ↓
[ Database Insert: Notification Table (Unread) ]
           ↓
[ Dispatch Channel Handlers ]
  ├── In-App Notification Center (Real-time badge counter)
  └── Outbox Logger / Brevo Transactional Email Simulation
```

---

## 4. Volunteer Join Request Lifecycle

```
[ Volunteer Submits Join Request ]
           ↓
[ JoinRequest Status: PENDING ]
           ↓
[ Club Head Reviews Request & Profile ]
           ↓
     +-----+-----+
     |           |
 [ APPROVE ]  [ REJECT ]
     |           |
     v           v
[ DB Transaction:                   [ JoinRequest Status: REJECTED ]
  1. Set JoinRequest: APPROVED
  2. Insert ClubMembership (VOLUNTEER)
  3. Emit Audit Log ]
```

---

## 5. Meeting Intelligence & Action Item Conversion

```
[ Raw Meeting Transcript / Notes Pasted ]
           ↓
[ AI Extraction Pipeline ]
  - Extracts title, suggested owner, due date, confidence score
           ↓
[ Persist ActionItem Records (Status: EXTRACTED) ]
           ↓
[ Club Head Reviews Items in UI ]
           ↓
[ Click "Convert to Tasks" ]
           ↓
[ DB Transaction:
  1. Create Task records
  2. Set ActionItem Status: CONVERTED (linking createdTaskId)
  3. Suggest Volunteer Assignments ]
```

---

## 6. Deterministic Risk Radar Lifecycle

```
[ Periodic / On-Demand State Scan ]
  - Query tasks due in < 48 hours still in TODO
  - Query tasks blocked by incomplete dependencies
  - Query events where assigned volunteers < min_volunteers_required
  - Query skill shortages against event skill_requirements
           ↓
[ Rule Engine Identifies Candidates ]
           ↓
[ AI Explainer Drafts Root-Cause & Actionable Mitigation ]
           ↓
[ Persist Risk Record (Severity: LOW, MEDIUM, HIGH, CRITICAL) ]
           ↓
[ Dispatch Risk Alert Notifications to Leadership & Assignees ]
```
