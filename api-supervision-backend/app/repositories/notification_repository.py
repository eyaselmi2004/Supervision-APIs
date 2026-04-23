from typing import List, Optional
from uuid import UUID

import asyncpg


class NotificationRepository:
    def __init__(self, conn: asyncpg.Connection):
        self.conn = conn

    async def get_all(self) -> List[asyncpg.Record]:
        return await self.conn.fetch(
            "SELECT * FROM notification_channels ORDER BY name"
        )

    async def get_by_id(self, channel_id: UUID) -> Optional[asyncpg.Record]:
        return await self.conn.fetchrow(
            "SELECT * FROM notification_channels WHERE id = $1", channel_id
        )

    async def create(
        self, name: str, channel_type: str, target: str, is_enabled: bool
    ) -> asyncpg.Record:
        return await self.conn.fetchrow(
            """
            INSERT INTO notification_channels (name, type, target, is_enabled)
            VALUES ($1, $2, $3, $4)
            RETURNING *
            """,
            name, channel_type, target, is_enabled,
        )

    async def update(
        self, channel_id: UUID,
        name: Optional[str] = None,
        target: Optional[str] = None,
        is_enabled: Optional[bool] = None,
    ) -> Optional[asyncpg.Record]:
        fields, values, idx = [], [], 1
        if name is not None:
            fields.append(f"name = ${idx}"); values.append(name); idx += 1
        if target is not None:
            fields.append(f"target = ${idx}"); values.append(target); idx += 1
        if is_enabled is not None:
            fields.append(f"is_enabled = ${idx}"); values.append(is_enabled); idx += 1
        if not fields:
            return await self.get_by_id(channel_id)
        values.append(channel_id)
        return await self.conn.fetchrow(
            f"UPDATE notification_channels SET {', '.join(fields)} WHERE id = ${idx} RETURNING *",
            *values,
        )

    async def delete(self, channel_id: UUID) -> bool:
        result = await self.conn.execute(
            "DELETE FROM notification_channels WHERE id = $1", channel_id
        )
        return result == "DELETE 1"