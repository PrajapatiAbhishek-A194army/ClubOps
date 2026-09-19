# Workflow Engine & State Machines

## Core Event Operations Lifecycle

The system coordinates multi-stage state progression:

```
[ NEW ]
   ↓
[ AI_PROCESSED ]
   ↓
[ TASKS_CREATED ]
   ↓
[ VOLUNTEERS_ASSIGNED ]
   ↓
[ IN_PROGRESS ]
   ↓
[ COMPLETED ]
   ↓
[ KNOWLEDGE_ARCHIVED ]
```

## State Definitions
- **NEW**: Event initialized with title, objective, date, and basic scope.
- **AI_PROCESSED**: Groq workflow decomposes event requirements into structured phases, milestones, and task templates.
- **TASKS_CREATED**: Tasks validated and persisted with priority, deadlines, and dependencies.
- **VOLUNTEERS_ASSIGNED**: AI recommends volunteer matchups based on skill and availability; confirmed by leads.
- **IN_PROGRESS**: Active execution monitored by background risk detection engines.
- **COMPLETED**: Post-event reconciliation, attendance check-ins, and debrief notes recorded.
- **KNOWLEDGE_ARCHIVED**: Event artifacts vectorized into RAG repository for institutional memory.
