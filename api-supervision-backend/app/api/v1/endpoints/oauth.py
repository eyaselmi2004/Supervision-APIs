import secrets
import traceback
from urllib.parse import urlencode

import asyncpg
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import RedirectResponse
from authlib.integrations.starlette_client import OAuth

from app.core.config import settings
from app.core.database import get_conn
from app.core.security import create_access_token, create_refresh_token, hash_password

router = APIRouter(prefix="/oauth", tags=["OAuth"])

oauth = OAuth()

oauth.register(
    name="google",
    client_id=settings.GOOGLE_CLIENT_ID,
    client_secret=settings.GOOGLE_CLIENT_SECRET,
    server_metadata_url="https://accounts.google.com/.well-known/openid-configuration",
    client_kwargs={"scope": "openid email profile"},
)

oauth.register(
    name="github",
    client_id=settings.GITHUB_CLIENT_ID,
    client_secret=settings.GITHUB_CLIENT_SECRET,
    access_token_url="https://github.com/login/oauth/access_token",
    authorize_url="https://github.com/login/oauth/authorize",
    api_base_url="https://api.github.com/",
    client_kwargs={"scope": "read:user user:email"},
)


def build_frontend_redirect(access_token: str, refresh_token: str) -> str:
    params = urlencode(
        {
            "access_token": access_token,
            "refresh_token": refresh_token,
        }
    )
    return f"{settings.FRONTEND_URL}/oauth-success?{params}"


async def get_default_user_role(conn: asyncpg.Connection) -> str:
    """
    Certains projets ont l'enum PostgreSQL avec DEVOPS,
    d'autres avec DEV. Cette fonction évite l'erreur OAuth.
    """
    rows = await conn.fetch(
        """
        SELECT e.enumlabel
        FROM pg_type t
        JOIN pg_enum e ON t.oid = e.enumtypid
        WHERE t.typname = 'userrole'
        ORDER BY e.enumsortorder
        """
    )

    roles = [row["enumlabel"] for row in rows]

    if "DEVOPS" in roles:
        return "DEVOPS"

    if "DEV" in roles:
        return "DEV"

    if roles:
        return roles[0]

    return "DEVOPS"


async def get_or_create_oauth_user(
    conn: asyncpg.Connection,
    name: str,
    email: str,
):
    if not email:
        raise HTTPException(status_code=400, detail="Email OAuth introuvable")

    existing_user = await conn.fetchrow(
        """
        SELECT id, name, email, role, is_active, is_verified
        FROM users
        WHERE email = $1
        """,
        email,
    )

    if existing_user:
        updated_user = await conn.fetchrow(
            """
            UPDATE users
            SET is_verified = TRUE,
                is_active = TRUE,
                verification_token = NULL,
                verification_token_expires_at = NULL
            WHERE id = $1
            RETURNING id, name, email, role, is_active, is_verified
            """,
            existing_user["id"],
        )

        return updated_user

    default_role = await get_default_user_role(conn)
    random_password = secrets.token_urlsafe(32)

    new_user = await conn.fetchrow(
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
        VALUES ($1, $2, $3, $4, TRUE, TRUE, NULL, NULL)
        RETURNING id, name, email, role, is_active, is_verified
        """,
        name or email.split("@")[0],
        email,
        hash_password(random_password),
        default_role,
    )

    return new_user


def create_traceon_tokens(user) -> tuple[str, str]:
    token_data = {
        "sub": str(user["id"]),
        "role": str(user["role"]),
    }

    access_token = create_access_token(token_data)
    refresh_token = create_refresh_token(token_data)

    return access_token, refresh_token


@router.get("/google/login")
async def google_login(request: Request):
    redirect_uri = f"{settings.BACKEND_URL}/api/v1/oauth/google/callback"
    return await oauth.google.authorize_redirect(request, redirect_uri)


@router.get("/google/callback")
async def google_callback(
    request: Request,
    conn: asyncpg.Connection = Depends(get_conn),
):
    try:
        token = await oauth.google.authorize_access_token(request)

        user_info = token.get("userinfo")

        if not user_info:
            user_info = await oauth.google.userinfo(token=token)

        print("GOOGLE USER INFO:", user_info)

        email = user_info.get("email")
        name = user_info.get("name") or user_info.get("given_name") or email

        user = await get_or_create_oauth_user(
            conn=conn,
            name=name,
            email=email,
        )

        print("GOOGLE TRACEON USER:", dict(user))

        access_token, refresh_token = create_traceon_tokens(user)

        redirect_url = build_frontend_redirect(access_token, refresh_token)

        print("GOOGLE REDIRECT URL:", redirect_url[:120] + "...")

        return RedirectResponse(url=redirect_url)

    except Exception as exc:
        print("GOOGLE OAUTH ERROR:", repr(exc))
        traceback.print_exc()
        error_url = f"{settings.FRONTEND_URL}/login?oauth_error=google"
        return RedirectResponse(url=error_url)


@router.get("/github/login")
async def github_login(request: Request):
    redirect_uri = f"{settings.BACKEND_URL}/api/v1/oauth/github/callback"
    return await oauth.github.authorize_redirect(request, redirect_uri)


@router.get("/github/callback")
async def github_callback(
    request: Request,
    conn: asyncpg.Connection = Depends(get_conn),
):
    try:
        token = await oauth.github.authorize_access_token(request)

        profile_response = await oauth.github.get("user", token=token)
        profile = profile_response.json()

        print("GITHUB PROFILE:", profile)

        email = profile.get("email")

        if not email:
            emails_response = await oauth.github.get("user/emails", token=token)
            emails = emails_response.json()

            print("GITHUB EMAILS:", emails)

            primary_email = next(
                (
                    item
                    for item in emails
                    if item.get("primary") and item.get("verified")
                ),
                None,
            )

            if primary_email:
                email = primary_email.get("email")

        name = profile.get("name") or profile.get("login") or email

        user = await get_or_create_oauth_user(
            conn=conn,
            name=name,
            email=email,
        )

        print("GITHUB TRACEON USER:", dict(user))

        access_token, refresh_token = create_traceon_tokens(user)

        redirect_url = build_frontend_redirect(access_token, refresh_token)

        print("GITHUB REDIRECT URL:", redirect_url[:120] + "...")

        return RedirectResponse(url=redirect_url)

    except Exception as exc:
        print("GITHUB OAUTH ERROR:", repr(exc))
        traceback.print_exc()
        error_url = f"{settings.FRONTEND_URL}/login?oauth_error=github"
        return RedirectResponse(url=error_url)