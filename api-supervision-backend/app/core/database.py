import asyncpg
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


def get_pool() -> asyncpg.Pool:
    """
    Retourne le pool de connexions global.
    Utilisé par les services qui s'exécutent en arrière-plan
    avec asyncio.create_task() — ils ne peuvent pas utiliser
    la connexion injectée par Depends(get_conn) car elle est
    déjà fermée quand la tâche s'exécute.
    """
    if _pool is None:
        raise RuntimeError("Pool asyncpg non initialisé — démarrez l'application d'abord")
    return _pool


async def get_conn():
    """
    Dépendance FastAPI — injectée dans chaque route via Depends(get_conn).
    Fournit une connexion du pool, libérée automatiquement après la requête.
    """
    async with _pool.acquire() as conn:
        yield conn