# LLM Research & Model Architecture

## Model Selection: Groq Llama 3.3 70B Versatile
- **Ultra-low latency**: Essential for responsive real-time meeting parsing and on-the-fly planning.
- **Structured JSON Mode**: Supports native JSON schema enforcement for reliable function and tool parameter parsing.
- **Context Window**: 128k context allows ingestion of extensive meeting transcripts and club documentation.

## Temperature & Safety Parameters
- Planning / Extraction: `temperature = 0.1` (deterministic, fact-grounded)
- Announcement Generation: `temperature = 0.6` (creative yet professional)
