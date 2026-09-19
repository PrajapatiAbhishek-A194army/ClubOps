# AI Architectural Rules & Guardrails

## 1. Core Operating Principle
> **AI RECOMMENDS, HUMANS DECIDE, DETERMINISTIC RULES ENFORCE.**

The AI layer in ClubOps AI is an intelligent reasoning and assistance engine, not an autonomous administrator with raw database privileges.

---

## 2. Non-Negotiable Guardrails

### Rule 1: Zero Direct Database Access
The AI engine never executes raw SQL or connects directly to the database. All AI-driven state mutations flow strictly through allowlisted backend tools (`ClubOpsTools`) with typed Pydantic parameter schemas, RBAC permission verification, and database transactions.

### Rule 2: Deterministic Constraint Priority
AI recommendations (such as assigning a volunteer or estimating task duration) are treated as proposals. Even if an LLM suggests a volunteer:
- Hard constraints (club membership, active status, calendar availability, zero time-slot conflict, max workload limit) are verified deterministically by the backend.
- If a volunteer becomes unavailable between recommendation time and approval time, the backend immediately blocks execution.

### Rule 3: Mandatory Human-in-the-Loop Approval Gates
No state mutation (creating tasks from meetings, publishing announcements, assigning rosters) occurs autonomously without explicit human review and approval from an authorized Officer (President or Club Head).

### Rule 4: Explainable Reasoning
Every recommendation output must include human-readable rationale:
- **Staffing Estimator**: Explains why the minimum volunteer count and specific skill ratios are required based on event scale.
- **Candidate Recommender**: Explains skill match percentage, availability status, and workload balance.
- **Risk Radar**: Cites concrete application facts (e.g., "Task due in 12 hours while dependency is blocked").
- **Strategic Advisor**: Grounds operational recommendations on deterministic health score components.

### Rule 5: Prompt Injection Boundary & Untrusted Content Isolation
Meeting transcripts, uploaded documents, and chat inputs are treated as untrusted data:
- Content is enclosed within isolation delimiters (`<untrusted_content>`).
- Directives within user text attempting to modify database state, override system rules, or elevate permissions are ignored.

### Rule 6: Deterministic Fallback on Model Degradation
If Groq API services experience rate-limiting (HTTP 429), latency spikes, or network interruptions, the system immediately switches to deterministic fallback templates. Under no circumstances does the application crash or display raw error traces to end users.

---

## 3. Implementation Status Across All Domains

| Capability | Engine Type | Status | Human Approval Required? |
|:---|:---|:---:|:---:|
| **Event Staffing & Skill Breakdown** | Groq LLM + Fallback | ✅ Production | Yes (Club Head) |
| **Task Decomposition & Milestones** | Groq LLM + Fallback | ✅ Production | Yes (Club Head) |
| **Meeting Action Item Extraction** | Groq LLM + Fallback | ✅ Production | Yes (Meeting Lead) |
| **Smart Volunteer Matchmaking** | Rule Engine + AI Scorer | ✅ Production | Yes (Assigning Officer) |
| **Multi-Channel Announcement Drafts** | Groq LLM + Fallback | ✅ Production | Yes (Publisher) |
| **Deterministic Risk Radar** | Rule Engine | ✅ Production | Automated Monitoring |
| **Club Health Score (0–100)** | Deterministic Algorithm | ✅ Production | Read-Only |
| **Executive Strategic Advisor** | Groq LLM + Fallback | ✅ Production | Advisory Only |
| **Cryptographic Audit Interceptor** | SHA-256 Engine | ✅ Production | Automated Recording |
