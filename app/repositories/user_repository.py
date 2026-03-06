"""
user_repository.py — Accès BDD pour la table users

"""
from typing import Optional
from uuid import UUID

import asyncpg


class UserRepository:
    def __init__(self, conn: asyncpg.Connection):
        self.conn = conn

    async def get_by_email(self, email: str) -> Optional[asyncpg.Record]:
        return await self.conn.fetchrow(
            "SELECT * FROM users WHERE email = $1 AND is_active = TRUE",
            email,
        )

    async def get_by_id(self, user_id: UUID) -> Optional[asyncpg.Record]:
        return await self.conn.fetchrow(
            "SELECT * FROM users WHERE id = $1",
            user_id,
        )

    async def create(
        self,
        name: str,
        email: str,
        hashed_password: str,
        role: str,
    ) -> asyncpg.Record:
        return await self.conn.fetchrow(
            """
            INSERT INTO users (name, email, hashed_password, role)
            VALUES ($1, $2, $3, $4)
            RETURNING *
            """,
            name, email, hashed_password, role,
        )

    async def email_exists(self, email: str) -> bool:
        result = await self.conn.fetchval(
            "SELECT 1 FROM users WHERE email = $1", email
        )
        return result is not None
