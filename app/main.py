"""
main.py — Point d'entrée de l'application FastAPI
Pool asyncpg créé au démarrage, fermé à l'arrêt
"""
import os
from contextlib import asynccontextmanager
from dotenv import load_dotenv

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from loguru import logger

from app.core.config import settings
from app.core.database import create_pool, close_pool
from app.api.v1.router import api_router
from app.schemas.schemas import HealthResponse
from app.api.v1.endpoints.notifications import router as notifications_router
from app.api.v1.endpoints import webhooks
from app.api.v1.endpoints import health_checks


# Charger le .env
load_dotenv()

# ── Debug SMTP ────────────────────────────────────────────
print("="*60)
print("🔍 DEBUG CONFIGURATION")
print("="*60)
print(f"Répertoire courant : {os.getcwd()}")
print(f"SMTP_HOST chargé   : '{os.getenv('SMTP_HOST')}'")
print(f"SMTP_PORT chargé   : '{os.getenv('SMTP_PORT')}'")
print(f"SMTP_USER chargé   : '{os.getenv('SMTP_USER')}'")
smtp_pass = os.getenv('SMTP_PASSWORD')
print(f"SMTP_PASSWORD chargé : '{smtp_pass[:4] if smtp_pass else 'VIDE'}...' (complet: {len(smtp_pass) if smtp_pass else 0} chars)")
print(f"SMTP_FROM chargé   : '{os.getenv('SMTP_FROM')}'")
print(f"SMTP_FROM_NAME chargé : '{os.getenv('SMTP_FROM_NAME')}'")
print("="*60)
# ─────────────────────────────────────────────────────────


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info(f"Démarrage {settings.APP_NAME} v{settings.APP_VERSION}")
    await create_pool()
    yield
    await close_pool()
    logger.info("Application arrêtée")


# ✅ CRÉER L'APP EN PREMIER
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="Plateforme de supervision d'APIs — FastAPI + asyncpg + TimescaleDB",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# ✅ AJOUTER LES MIDDLEWARES
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ✅ ENREGISTRER LES ROUTERS (APRÈS la création de app)
app.include_router(api_router)
app.include_router(webhooks.router)
app.include_router(health_checks.router, prefix="/api/v1")
app.include_router(notifications_router, prefix="/api/v1")


# ✅ ROUTES SUPPLÉMENTAIRES
@app.get("/health", response_model=HealthResponse, tags=["Health"])
async def health():
    return HealthResponse(
        status="ok",
        version=settings.APP_VERSION,
        environment=settings.ENVIRONMENT,
    )