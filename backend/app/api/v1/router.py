from fastapi import APIRouter
from app.api.v1.endpoints import health, auth, clubs

api_router = APIRouter()

api_router.include_router(health.router, tags=["Health"])
api_router.include_router(auth.router, tags=["Auth"])
api_router.include_router(clubs.router, tags=["Clubs & Members"])

