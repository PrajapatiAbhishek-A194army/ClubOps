# AI Architectural Rules & Guardrails

## 1. Core Operating Principle
> **AI RECOMMENDS, HUMANS DECIDE, DETERMINISTIC RULES ENFORCE.**

The AI layer in ClubOps AI is an intelligent reasoning and extraction engine, not an autonomous administrator with direct database privileges.

---

## 2. Non-Negotiable Guardrails

### Rule 1: Zero Direct Database Access
The AI service never connects directly to PostgreSQL or SQLite. All interactions flow strictly through allowlisted backend service functions with typed Pydantic parameter schemas.

### Rule 2: Deterministic Constraint Priority
AI recommendations (such as assigning a volunteer or estimating task duration) are treated as proposals. Even if an LLM suggests a volunteer:
- Hard constraints (club membership, active status, calendar availability, zero time-slot conflict, max workload limit) are verified deterministically by the backend.
- If a volunteer becomes unavailable between the recommendation time and approval time, the backend immediately blocks execution.

### Rule 3: Explainable Staffing & Risk Reasoning
Every AI output must include deterministic rationale:
- **Staffing Estimator**: Must provide an explanation for the minimum volunteer requirement and why specific skill counts are necessary based on event duration and type.
- **Candidate Recommender**: Must provide skill match percentage, availability status, and reason summary.
- **Risk Radar**: Must cite concrete application data (e.g. "Venue booking task is due in 18 hours while the dependency 'Permission letter' is still unapproved").

### Rule 4: Prompt Injection Boundary & Untrusted Content
Meeting transcripts, uploaded PDFs, and user inputs are strictly treated as untrusted data:
- System instructions explicitly wrap user documents in isolation delimiters (e.g., `<untrusted_content>`).
- Any instruction contained inside an uploaded document attempting to modify database state, override system rules, or grant elevated roles is ignored.

### Rule 5: Idempotent Execution
AI operations (such as processing meeting transcripts or generating event task breakdowns) are idempotent or require explicit confirmation tokens to avoid duplicate task generation.
