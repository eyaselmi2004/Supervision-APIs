from typing import List, Optional
from uuid import UUID

import asyncpg


class ApiServiceRepository:
    def __init__(self, conn: asyncpg.Connection):
        self.conn = conn

    # ── ApiService ───────────────────────────────────────

    async def get_all(self) -> List[asyncpg.Record]:
        return await self.conn.fetch(
            "SELECT * FROM api_services ORDER BY name"
        )

    async def get_by_id(self, service_id: UUID) -> Optional[asyncpg.Record]:
        return await self.conn.fetchrow(
            "SELECT * FROM api_services WHERE id = $1", service_id
        )

    async def create(self, name: str, base_url: str, is_active: bool) -> asyncpg.Record:
        return await self.conn.fetchrow(
            """
            INSERT INTO api_services (name, base_url, is_active)
            VALUES ($1, $2, $3)
            RETURNING *
            """,
            name, base_url, is_active,
        )

    async def update(
        self, service_id: UUID,
        name: Optional[str] = None,
        base_url: Optional[str] = None,
        is_active: Optional[bool] = None,
    ) -> Optional[asyncpg.Record]:
        fields, values, idx = [], [], 1
        if name is not None:
            fields.append(f"name = ${idx}"); values.append(name); idx += 1
        if base_url is not None:
            fields.append(f"base_url = ${idx}"); values.append(base_url); idx += 1
        if is_active is not None:
            fields.append(f"is_active = ${idx}"); values.append(is_active); idx += 1
        if not fields:
            return await self.get_by_id(service_id)
        values.append(service_id)
        return await self.conn.fetchrow(
            f"UPDATE api_services SET {', '.join(fields)} WHERE id = ${idx} RETURNING *",
            *values,
        )

    async def delete(self, service_id: UUID) -> bool:
        result = await self.conn.execute(
            "DELETE FROM api_services WHERE id = $1", service_id
        )
        return result == "DELETE 1"

    # ── Endpoints ────────────────────────────────────────

    async def get_endpoints(self, service_id: UUID) -> List[asyncpg.Record]:
        return await self.conn.fetch(
            "SELECT * FROM endpoints WHERE api_service_id = $1", service_id
        )

    async def get_endpoint_by_id(self, endpoint_id: UUID) -> Optional[asyncpg.Record]:
        return await self.conn.fetchrow(
            "SELECT * FROM endpoints WHERE id = $1", endpoint_id
        )

    async def create_endpoint(
        self, service_id: UUID, path: str, method: str, is_active: bool
    ) -> asyncpg.Record:
        return await self.conn.fetchrow(
            """
            INSERT INTO endpoints (api_service_id, path, method, is_active)
            VALUES ($1, $2, $3, $4)
            RETURNING *
            """,
            service_id, path, method, is_active,
        )

    async def find_endpoint(
        self, service_id: UUID, path: str, method: str
    ) -> Optional[asyncpg.Record]:
        return await self.conn.fetchrow(
            "SELECT * FROM endpoints WHERE api_service_id = $1 AND path = $2 AND method = $3",
            service_id, path, method,
        )