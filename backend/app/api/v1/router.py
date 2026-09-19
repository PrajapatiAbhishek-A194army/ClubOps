from fastapi import APIRouter
from app.api.v1.endpoints import (
    announcements,
    auth,
    clubs,
    dashboards,
    events,
    health,
    join_requests,
    knowledge,
    meetings,
    notifications,
    risks,
    tasks,
    volunteers,
    workflows,
)

api_router = APIRouter()

api_router.include_router(health.router, tags=["Health"])
api_router.include_router(auth.router, tags=["Auth"])
api_router.include_router(clubs.router, tags=["Clubs & Governance"])
api_router.include_router(join_requests.router, tags=["Join Requests"])
api_router.include_router(events.router, tags=["Events & AI Staffing"])
api_router.include_router(tasks.router, tags=["Tasks & Kanban"])
api_router.include_router(volunteers.router, tags=["Volunteers & Skills"])
api_router.include_router(workflows.router, tags=["AI Workflows & Orchestration"])
api_router.include_router(announcements.router, tags=["Announcements & Multi-Channel Broadcast"])
api_router.include_router(dashboards.router, tags=["Role-Based Dashboards"])
api_router.include_router(notifications.router, prefix="/notifications", tags=["Notifications"])
api_router.include_router(risks.router, prefix="/risks", tags=["Risks Radar"])
api_router.include_router(meetings.router, prefix="/meetings", tags=["Meeting Intelligence"])
api_router.include_router(knowledge.router, prefix="/knowledge", tags=["Institutional Knowledge RAG"])
