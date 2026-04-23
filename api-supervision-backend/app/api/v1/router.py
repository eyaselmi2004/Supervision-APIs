from fastapi import APIRouter
from app.api.v1.endpoints import auth, api_services, metrics, alerts, sla_incidents, users, projects, teams
# users : nouveau module de gestion des utilisateurs

api_router = APIRouter(prefix="/api/v1")

api_router.include_router(auth.router)
api_router.include_router(api_services.router)
api_router.include_router(metrics.router)
api_router.include_router(alerts.router)
api_router.include_router(sla_incidents.router)
api_router.include_router(users.router)
# users.router : expose GET /users et DELETE /users/{id}
api_router.include_router(projects.router) 

api_router.include_router(teams.router)
