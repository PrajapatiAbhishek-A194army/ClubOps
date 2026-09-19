# Security Architecture & RBAC Policies

## 1. Security Principles
1. **Deny-by-Default Access Control**: Every endpoint validates authentication and club context authorization.
2. **Context-Derived Roles**: Roles are scoped to clubs through `ClubMembership`. A user may be `PRESIDENT` in Club A and `VOLUNTEER` in Club B. The server always resolves the user's role from the active club scope, never from frontend-provided claims.
3. **Club Head Uniqueness**: A club can have at most one active Club Head. Reassignment requires deactivating the previous active Head within a single atomic database transaction.
4. **Separation of Duties**:
   - **President**: Creates clubs, transfers Club Head, views high-level governance and risk overview.
   - **Club Head**: Manages club operations, creates events, reviews AI staffing and volunteer assignment proposals, reviews meeting action items, publishes announcements.
   - **Volunteer**: Discovers clubs, submits join requests, declares skills & availability, views assigned tasks, updates task progress.
5. **Immutable Audit Logs**: All state-modifying actions initiated by humans, AI tools, or rule engines are recorded in the `AuditLog` table with actor ID, entity ID, action verb, and timestamp.
6. **Zero Client Secret Exposure**: LLM API keys (Groq, OpenAI) and email credentials (Brevo) are accessed strictly on the server side via environment variables.
