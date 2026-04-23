from fastapi import APIRouter, Depends, HTTPException, status
import asyncpg

from app.core.database import get_conn
from app.core.security import (
    hash_password, verify_password,
    create_access_token, create_refresh_token, decode_token,
)
from app.repositories.user_repository import UserRepository
from app.schemas.schemas import (
    LoginRequest, TokenResponse, TokenRefreshRequest,
    UserCreate, UserResponse, MessageResponse,
)

router = APIRouter(prefix="/auth", tags=["Auth"])


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register(data: UserCreate, conn: asyncpg.Connection = Depends(get_conn)):
    repo = UserRepository(conn)
    if await repo.email_exists(data.email):
        raise HTTPException(status_code=400, detail="Email déjà utilisé")
    user = await repo.create(
        name=data.name,
        email=data.email,
        hashed_password=hash_password(data.password),
        role=data.role.value,
    )
    return dict(user)


@router.post("/login", response_model=TokenResponse)
async def login(data: LoginRequest, conn: asyncpg.Connection = Depends(get_conn)):
    repo = UserRepository(conn)
    user = await repo.get_by_email(data.email)
    if not user or not verify_password(data.password, user["hashed_password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email ou mot de passe incorrect",
        )
    token_data = {"sub": str(user["id"]), "role": user["role"]}
    return TokenResponse(
        access_token=create_access_token(token_data),
        refresh_token=create_refresh_token(token_data),
    )


@router.post("/refresh", response_model=TokenResponse)
async def refresh(data: TokenRefreshRequest):
    payload = decode_token(data.refresh_token)
    if payload.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="Token de rafraîchissement invalide")
    token_data = {"sub": payload["sub"], "role": payload.get("role", "DEV")}
    return TokenResponse(
        access_token=create_access_token(token_data),
        refresh_token=create_refresh_token(token_data),
    )