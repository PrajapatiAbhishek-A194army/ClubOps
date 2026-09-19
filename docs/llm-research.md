# LLM Architecture, Model Evaluations & Prompt Engineering

## 1. Model Selection & Rationale: Groq Cloud

ClubOps AI requires sub-second response times for interactive user workflows (meeting parsing, event decomposition, on-the-fly announcement drafting). Traditional cloud LLM APIs often introduce 3–10s latencies that degrade user experience.

By utilizing the **Groq LPU (Language Processing Unit)** inference engine, ClubOps AI achieves:
- **Inference Speed**: 250–500 tokens per second.
- **Time-to-First-Token (TTFT)**: Under 250ms.
- **Native JSON Mode**: Guaranteed schema compliance without regex post-processing failures.

---

## 2. Model Evaluation Matrix

| Model Tier | Identifier | Context Window | Target Use Case | Latency (avg) | Fallback Priority |
|:---|:---|:---:|:---|:---:|:---:|
| **Primary Production** | `openai/gpt-oss-120b` | 128k tokens | High-reasoning event decomposition & meeting parsing | ~450ms | Tier 1 |
| **High-Throughput** | `llama-3.3-70b-versatile` | 128k tokens | Multilingual announcements & volunteer matching | ~350ms | Tier 2 |
| **Ultra-Fast Agent** | `llama-3.1-8b-instant` | 128k tokens | Fast tool extraction & quick status categorization | ~180ms | Tier 3 |
| **Deterministic Fallback** | Local Template Engine | N/A | Zero-latency emergency fallback on rate limits (429) | < 5ms | Safety Net |

---

## 3. Graceful Fallback & Rate-Limit Degradation

To guarantee 100% platform availability even under strict token-per-day (TPD) quotas:
```
[ User Request ]
       ↓
[ Attempt Groq API (Primary Model) ]
       ↓
    Success?
   ├── YES ──> Parse & Validate JSON ──> Return Result
   └── NO (HTTP 429 / 503 / Network Error)
          ↓
     [ Fallback to Secondary Model ]
          ↓
       Success?
      ├── YES ──> Parse & Validate JSON ──> Return Result
      └── NO ──> [ Deterministic Schema Template Engine ]
                    - Generates structured, domain-accurate defaults
                    - Emits telemetry warning
                    - Zero user-facing downtime
```

---

## 4. Temperature & Sampling Configuration

- **Meeting Action Item Extraction**: `temperature = 0.1`
  - Eliminates hallucinated commitments; strictly extracts facts mentioned in the transcript.
- **Event Staffing Estimator**: `temperature = 0.2`
  - High mathematical consistency for volunteer and skill count breakdowns.
- **Volunteer Matchmaking**: `temperature = 0.2`
  - Prioritizes exact skill tag matches and verified calendar availability.
- **Announcement Generation**: `temperature = 0.5`
  - Balances creativity, engaging tone, and clear Call-to-Action (CTA).
- **Executive Analytics Insights**: `temperature = 0.3`
  - Actionable, grounded recommendations derived from live club health data.

---

## 5. Structured JSON Output Schemas

### A. Event Staffing & Task Decomposition Schema
```json
{
  "min_volunteers_required": 8,
  "skill_requirements": [
    { "skill_name": "Audio/Visual", "required_count": 2 },
    { "skill_name": "Logistics", "required_count": 3 },
    { "skill_name": "Registration", "required_count": 3 }
  ],
  "proposed_tasks": [
    {
      "task_title": "Stage AV Setup & Mic Testing",
      "task_description": "Configure audio levels and test wireless mics before opening.",
      "priority": "HIGH",
      "suggested_role": "Audio/Visual",
      "estimated_hours": 3
    }
  ],
  "ai_explanation": "Based on a 2-day workshop scale with expected 200 attendees..."
}
```

### B. Meeting Action Item Extraction Schema
```json
{
  "action_items": [
    {
      "title": "Finalize venue contract",
      "description": "Meet with campus administration to approve Room 402.",
      "suggested_owner": "Rahul Sharma",
      "suggested_deadline": "2026-10-12T17:00:00Z",
      "confidence_score": 0.95
    }
  ]
}
```
