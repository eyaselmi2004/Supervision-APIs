from fastapi import APIRouter
from app.api.v1.endpoints import auth, api_services, metrics, alerts, sla_incidents

api_router = APIRouter(prefix="/api/v1")

api_router.include_router(auth.router)
api_router.include_router(api_services.router)
api_router.include_router(metrics.router)
api_router.include_router(alerts.router)
api_router.include_router(sla_incidents.router)