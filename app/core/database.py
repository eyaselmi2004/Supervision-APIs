
import asyncpg #bibliothèque Python pour se connecter à une base de données PostgreSQL de manière asynchrone(non bloquante)
from loguru import logger
from app.core.config import settings

# Pool global — initialisé au démarrage de l'app dans main.py
_pool: asyncpg.Pool | None = None

async def create_pool() -> None:
    """Crée le pool de connexions asyncpg au démarrage."""
    global _pool
    _pool = await asyncpg.create_pool(
        dsn=settings.DATABASE_URL,
        min_size=settings.DB_MIN_CONNECTIONS,
        max_size=settings.DB_MAX_CONNECTIONS,
    )
    logger.info("Pool asyncpg créé ")


async def close_pool() -> None:
    """Ferme proprement le pool à l'arrêt de l'app."""
    global _pool
    if _pool:
        await _pool.close()
        logger.info("Pool asyncpg fermé ")


async def get_conn():
    """
    Dépendance FastAPI — injectée dans chaque route via Depends(get_conn).
    Fournit une connexion du pool, libérée automatiquement après la requête.
    """
    async with _pool.acquire() as conn:
        yield conn
