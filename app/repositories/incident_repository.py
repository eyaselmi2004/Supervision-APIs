from datetime import datetime, timezone
from typing import List, Optional
from uuid import UUID

import asyncpg


class IncidentRepository:
    def __init__(self, conn: asyncpg.Connection):
        self.conn = conn

    async def get_all(self) -> List[asyncpg.Record]:
        return await self.conn.fetch(
            "SELECT * FROM incidents ORDER BY start_time DESC"
        )

    async def get_by_id(self, incident_id: UUID) -> Optional[asyncpg.Record]:
        return await self.conn.fetchrow(
            "SELECT * FROM incidents WHERE id = $1", incident_id
        )

    async def create(
        self,
        title: str,
        api_service_id: UUID,
        source_alert_id: Optional[UUID] = None,
    ) -> asyncpg.Record:
        return await self.conn.fetchrow(
            """
            INSERT INTO incidents (title, api_service_id, source_alert_id)
            VALUES ($1, $2, $3)
            RETURNING *
            """,
            title, api_service_id, source_alert_id,
        )

    async def resolve(self, incident_id: UUID, resolution: str) -> Optional[asyncpg.Record]:
        return await self.conn.fetchrow(
            """
            UPDATE incidents
            SET status = 'RESOLVED',
                end_time   = $1,
                resolution = $2
            WHERE id = $3
            RETURNING *
            """,
            datetime.now(timezone.utc), resolution, incident_id,
        )