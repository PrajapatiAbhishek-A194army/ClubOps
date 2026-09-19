# Security Architecture & Cryptographic Governance

ClubOps AI is engineered around enterprise-grade security standards designed for organizational sovereignty, strict role separation, zero client secret exposure, and mathematically verifiable audit integrity.

---

## 1. Core Security Principles

### Principle of Deny-by-Default
Every API endpoint in ClubOps AI requires explicit authentication and context-derived authorization. If an incoming request lacks valid credentials, attempts an unpermitted operation, or fails club membership verification, access is strictly rejected with `401 Unauthorized` or `403 Forbidden`.

### Context-Derived Active Roles
Role privileges in ClubOps AI are **club-scoped**, never globally elevated:
- A user can be a `PRESIDENT` in the Developer Club, an `ORGANIZER` in the Robotics Society, and a `VOLUNTEER` in the Cultural Committee.
- The server validates the user's active membership against the target `club_id` dynamically from the database on every state-mutating request.
- Frontend-provided role claims are never trusted blindly; claims in the JWT token (`active_club_id`, `active_role`) are cryptographically verified and checked against database state.

---

## 2. Four-Tier Role Hierarchy & Permissions Matrix

| Capability / Operation | President | Organizer (Club Head) | Team Lead | Volunteer / Member |
|:---|:---:|:---:|:---:|:---:|
| **Transfer Club Presidency** | ✅ | ❌ | ❌ | ❌ |
| **Manage Club Settings & Code** | ✅ | ❌ | ❌ | ❌ |
| **Approve / Reject Join Requests** | ✅ | ✅ | ❌ | ❌ |
| **Create & Edit Events** | ✅ | ✅ | ❌ | ❌ |
| **Trigger AI Staffing & Plan Approval** | ✅ | ✅ | ❌ | ❌ |
| **Manage Department Tasks & Kanban** | ✅ | ✅ | ✅ | ❌ |
| **Update Own Task Status (`TODO` -> `DONE`)** | ✅ | ✅ | ✅ | ✅ |
| **Assign Volunteers to Tasks** | ✅ | ✅ | ✅ | ❌ |
| **Run Deterministic Risk Radar Scan** | ✅ | ✅ | ✅ | ❌ |
| **Ingest Meeting Notes & Convert Items** | ✅ | ✅ | ✅ | ❌ |
| **Generate AI Announcement Drafts** | ✅ | ✅ | ✅ | ❌ |
| **Publish Announcements & Email Broadcast** | ✅ | ✅ | ❌ | ❌ |
| **Real-Time Operations Chat** | ✅ | ✅ | ✅ | ✅ |
| **Access Executive Analytics & Health Score** | ✅ | ✅ | ❌ | ❌ |
| **View Audit Logs & Cryptographic Verify** | ✅ | ❌ | ❌ | ❌ |

---

## 3. Cryptographic SHA-256 Audit Trail

ClubOps AI implements an immutable, sequential audit chain utilizing SHA-256 cryptographic hashing to provide mathematical proof of data integrity.

### Block Chaining Architecture
```
+---------------------------+       +---------------------------+
|      Audit Entry #1       |       |      Audit Entry #2       |
|  prev_hash: "0000...0000" |       |  prev_hash: [Hash of #1]  |
|  action: "CREATE_CLUB"    | ----> |  action: "CREATE_EVENT"   |
|  actor: "President"       |       |  actor: "Organizer"       |
|  integrity_hash: [Hash #1]|       |  integrity_hash: [Hash #2]|
+---------------------------+       +---------------------------+
                                                  |
                                                  v
                                    +---------------------------+
                                    |      Audit Entry #3       |
                                    |  prev_hash: [Hash of #2]  |
                                    |  action: "ASSIGN_TASK"    |
                                    |  integrity_hash: [Hash #3]|
                                    +---------------------------+
```

### Canonical Hash Calculation
The integrity hash for entry $N$ is calculated deterministically:
$$\text{Hash}_N = \text{SHA-256}(\text{prev\_hash} \,\|\, \text{club\_id} \,\|\, \text{action} \,\|\, \text{entity\_type} \,\|\, \text{entity\_id} \,\|\, \text{actor\_id} \,\|\, \text{timestamp\_iso} \,\|\, \text{canonical\_diff\_json})$$

Where:
- `prev_hash`: The `integrity_hash` of entry $N-1$ (or 64 zeros `0000...0000` for the Genesis entry).
- `canonical_diff_json`: State difference serialized with sorted keys and zero extraneous whitespace.

### Live Tamper Detection Engine
Any modification to an existing audit record (such as an unauthorized database update or deleted entry) breaks the sequential hash chain. 
- Endpoint: `GET /api/v1/clubs/{club_id}/audit/verify-integrity`
- Verifies every historical record from Genesis to the current head.
- Identifies the exact record `id` and sequence index if tampering is detected.

---

## 4. Separation of Duties (SoD) Governance

To prevent misuse of operational authority, ClubOps AI enforces strict Separation of Duties policies:

1. **Executive Isolation**: Only Presidents may transfer organizational leadership or view cryptographic audit verifications.
2. **Approval Gate Separation**: AI tools are strictly advisory. No AI pipeline may directly commit database mutations without explicit human approval by a qualified officer.
3. **Broadcast Authorization**: Mass multi-channel dispatch (Email via Brevo, in-app push) requires Executive or Club Head clearance to eliminate spam or unauthorized campus communications.
4. **Credential Isolation**: Third-party API keys (Groq, Brevo) are stored exclusively in backend environment variables and are never transmitted to client browsers.

---

## 5. Network & Token Security

- **JWT Tokens**: Signed using HMAC-SHA256 with expiration enforcement.
- **Password Protection**: Passwords hashed using `bcrypt` with adaptive work factor salts.
- **CORS & Headers**: Strict Cross-Origin Resource Sharing whitelist preventing unauthorized cross-site scripting.
- **WebSocket Authentication**: Real-time WebSocket connection upgrades require valid JWT authentication query tokens before joining the live connection pool.
