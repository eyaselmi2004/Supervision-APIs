from fastapi import APIRouter

from app.api.v1.endpoints import (
    auth,
    api_services,
    metrics,
    alerts,
    sla_incidents,
    users,
    projects,
    teams,
    agent,
    oauth,
)
from app.api.v1.endpoints.llm import router as llm_router

api_router = APIRouter(prefix="/api/v1")

api_router.include_router(auth.router)
api_router.include_router(oauth.router)
api_router.include_router(api_services.router)
api_router.include_router(metrics.router)
api_router.include_router(alerts.router)
api_router.include_router(sla_incidents.router)
api_router.include_router(users.router)
api_router.include_router(projects.router)
api_router.include_router(llm_router)
api_router.include_router(teams.router)
api_router.include_router(agent.router)