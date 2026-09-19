# API Contracts & Conventions

## Base URL
`/api/v1`

## Standard Envelope
```json
{
  "success": true,
  "data": {},
  "error": null,
  "message": "Operation successful"
}
```

## Core Route Groups
- `/health`: Health status and database latency checks.
- `/auth`: Registration, JWT authentication, token refresh, and profile.
- `/clubs`: Club profile, settings, and member management.
- `/events`: Event CRUD, timelines, and operational state transitions.
- `/tasks`: Kanban task tracking, dependencies, and assignments.
- `/volunteers`: Volunteer directory, skills, availability, and AI matching.
- `/meetings`: Meeting minutes intake and automated action item extraction.
- `/documents`: Knowledge base uploads and RAG search endpoints.
- `/risks`: Real-time risk detection alerts and mitigation guidance.
- `/announcements`: AI-generated and manually scheduled communications.
