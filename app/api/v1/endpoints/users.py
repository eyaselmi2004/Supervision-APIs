from typing import List
from uuid import UUID
from fastapi import APIRouter, Depends
import asyncpg

from app.core.database import get_conn
from app.core.security import get_current_user_id
from app.schemas.schemas import UserResponse

router = APIRouter(prefix="/users", tags=["Users"])

@router.get("/me", response_model=UserResponse)
async def get_current_user(
    conn: asyncpg.Connection = Depends(get_conn),
    user_id: str = Depends(get_current_user_id),
):
    """
    Récupère l'utilisateur actuellement connecté.
    """
    row = await conn.fetchrow("""
        SELECT id, name, email, role, is_active, created_at
        FROM users
        WHERE id = $1
    """, user_id)
    if not row:
        raise ValueError("Utilisateur non trouvé")
    return dict(row)


@router.get("/", response_model=List[UserResponse])
async def get_all_users(
    conn: asyncpg.Connection = Depends(get_conn),
    _: str = Depends(get_current_user_id),
):
    """
    Récupère la liste de tous les utilisateurs actifs.
    Nécessite une authentification.
    """
    rows = await conn.fetch("""
        SELECT id, name, email, role, is_active, created_at
        FROM users
        ORDER BY created_at DESC
    """)
    return [dict(r) for r in rows]


@router.delete("/{user_id}")
async def delete_user(
    user_id: UUID,
    conn: asyncpg.Connection = Depends(get_conn),
    _: str = Depends(get_current_user_id),
):
    """
    Supprime un utilisateur par son ID.
    Nécessite une authentification.
    """
    await conn.execute("DELETE FROM users WHERE id = $1", user_id)
    return {"deleted": True}