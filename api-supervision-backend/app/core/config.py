from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        extra="ignore",
    )

    # ── Application ──────────────────────────────────────
    APP_NAME: str = "API Supervision Platform"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False
    ENVIRONMENT: str = "development"

    # ── Base de données ───────────────────────────────────
    DATABASE_URL: str = "postgresql://supervision_user:supervision_pass@localhost:5432/supervision_db"
    DB_MIN_CONNECTIONS: int = 5
    DB_MAX_CONNECTIONS: int = 20

    # ── Redis ─────────────────────────────────────────────
    REDIS_URL: str = "redis://localhost:6379/0"

    # ── Celery ────────────────────────────────────────────
    CELERY_BROKER_URL: str = "redis://localhost:6379/1"
    CELERY_RESULT_BACKEND: str = "redis://localhost:6379/2"

    # ── JWT ───────────────────────────────────────────────
    SECRET_KEY: str = "changeme"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # ── CORS — défini ici, pas dans .env ─────────────────
    # Liste des origines autorisées pour les requêtes CORS
    # localhost:3000 = frontend React (Vite dev server)
    # localhost:5173 = frontend React (port alternatif Vite)
    ALLOWED_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:5173",
    ]

    # ── SMTP ─────────────────────────────────────────────
    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_FROM: str = ""
    SMTP_FROM_NAME: str = "Supervision APIs"


    OLLAMA_BASE_URL: str = "http://178.104.208.132:11434"
    OLLAMA_MODEL: str = "qwen2.5:3b"
    OLLAMA_TIMEOUT_SECONDS: int = 120
    


# Instance unique importée partout dans l'application
settings = Settings()