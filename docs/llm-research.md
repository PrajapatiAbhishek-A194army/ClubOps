# LLM Research & Model Architecture

## Model Selection: Groq
The AI services utilize the Groq API for its ultra-low latency and JSON output support.

The primary model is configured via `GROQ_MODEL` (defaulting to `"openai/gpt-oss-120b"`).
Fallback cascade strategies (e.g., in Task Suggestion) attempt multiple models to ensure robustness:
1. Configured `GROQ_MODEL`
2. `"openai/gpt-oss-120b"`
3. `"groq/compound-mini"`
4. `"qwen/qwen3.8-27b"`

- **Structured JSON Mode**: Used extensively for parsing AI task breakdown and meeting-to-action item extraction reliably.

## Temperature Parameters
- **Meeting Extraction**: `temperature = 0.1` (highly deterministic, transcript-grounded)
- **Knowledge Synthesis (RAG)**: `temperature = 0.2` (grounded on retrieved document context)
- **Event Staffing Estimator**: `temperature = 0.2` (structured mathematical planning)
- **Task Suggestion / Planning**: `temperature = 0.3` (slight variance for brainstorming milestones)
