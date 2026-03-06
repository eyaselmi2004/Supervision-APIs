"""
main.py — Point d'entrée de l'application FastAPI
Pool asyncpg créé au démarrage, fermé à l'arrêt
"""
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from loguru import logger

from app.core.config import settings
from app.core.database import create_pool, close_pool
from app.api.v1.router import api_router
from app.schemas.schemas import HealthResponse


@asynccontextmanager
async def lifespan(app: FastAPI):
    # démarrage
    logger.info(f"Démarrage {settings.APP_NAME} v{settings.APP_VERSION}")
    await create_pool()
    yield
    # arrêt
    await close_pool()
    logger.info("Application arrêtée")


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="Plateforme de supervision d'APIs — FastAPI + asyncpg + TimescaleDB",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

#  CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# routes
app.include_router(api_router)


# health check
@app.get("/health", response_model=HealthResponse, tags=["Health"])
async def health():
    return HealthResponse(
        status="ok",
        version=settings.APP_VERSION,
        environment=settings.ENVIRONMENT,
    )
