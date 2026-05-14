from datetime import datetime, timedelta, timezone
import secrets

from fastapi import APIRouter, Depends, HTTPException, status
import asyncpg

from app.core.database import get_conn
from app.core.security import (
    hash_password,
    verify_password,
    create_access_token,
    create_refresh_token,
    decode_token,
)
from app.repositories.user_repository import UserRepository
from app.schemas.schemas import (
    LoginRequest,
    TokenResponse,
    TokenRefreshRequest,
    UserCreate,
    MessageResponse,
)
from app.services.email_service import send_verification_email

router = APIRouter(prefix="/auth", tags=["Auth"])


@router.post("/register", response_model=MessageResponse, status_code=status.HTTP_201_CREATED)
async def register(data: UserCreate, conn: asyncpg.Connection = Depends(get_conn)):
    repo = UserRepository(conn)

    if await repo.email_exists(data.email):
        raise HTTPException(status_code=400, detail="Email déjà utilisé")

    verification_token = secrets.token_urlsafe(48)
    verification_token_expires_at = datetime.now(timezone.utc) + timedelta(hours=24)

    user = await conn.fetchrow(
        """
        INSERT INTO users (
            name,
            email,
            hashed_password,
            role,
            is_active,
            is_verified,
            verification_token,
            verification_token_expires_at
        )
        VALUES ($1, $2, $3, $4, TRUE, FALSE, $5, $6)
        RETURNING id, name, email
        """,
        data.name,
        data.email,
        hash_password(data.password),
        data.role.value,
        verification_token,
        verification_token_expires_at,
    )

    verification_link = f"http://localhost:3000/verify-email?token={verification_token}"

    send_verification_email(
        to_email=user["email"],
        user_name=user["name"],
        verification_link=verification_link,
    )

    return {
        "message": "Compte créé avec succès. Veuillez vérifier votre adresse email."
    }


@router.get("/verify-email", response_model=MessageResponse)
async def verify_email(token: str, conn: asyncpg.Connection = Depends(get_conn)):
    user = await conn.fetchrow(
        """
        SELECT id, verification_token_expires_at, is_verified
        FROM users
        WHERE verification_token = $1
        """,
        token,
    )

    if not user:
        raise HTTPException(status_code=400, detail="Lien de vérification invalide")

    if user["is_verified"]:
        return {"message": "Email déjà vérifié"}

    expires_at = user["verification_token_expires_at"]

    if expires_at and expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Lien de vérification expiré")

    await conn.execute(
        """
        UPDATE users
        SET is_verified = TRUE,
            verification_token = NULL,
            verification_token_expires_at = NULL
        WHERE id = $1
        """,
        user["id"],
    )

    return {"message": "Adresse email vérifiée avec succès"}


@router.post("/login", response_model=TokenResponse)
async def login(data: LoginRequest, conn: asyncpg.Connection = Depends(get_conn)):
    repo = UserRepository(conn)

    user = await repo.get_by_email(data.email)

    if not user or not verify_password(data.password, user["hashed_password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email ou mot de passe incorrect",
        )

    if not user["is_verified"]:
        raise HTTPException(
            status_code=403,
            detail="Veuillez vérifier votre adresse email avant de vous connecter.",
        )

    token_data = {
        "sub": str(user["id"]),
        "role": user["role"],
    }

    return TokenResponse(
        access_token=create_access_token(token_data),
        refresh_token=create_refresh_token(token_data),
    )


@router.post("/refresh", response_model=TokenResponse)
async def refresh(data: TokenRefreshRequest):
    payload = decode_token(data.refresh_token)

    if payload.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="Token de rafraîchissement invalide")

    token_data = {
        "sub": payload["sub"],
        "role": payload.get("role", "DEV"),
    }

    return TokenResponse(
        access_token=create_access_token(token_data),
        refresh_token=create_refresh_token(token_data),
    )