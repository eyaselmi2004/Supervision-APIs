from datetime import datetime
from typing import List
from uuid import UUID

import asyncpg


class SlaRepository:
    def __init__(self, conn: asyncpg.Connection):
        self.conn = conn

    async def get_by_endpoint(
        self, endpoint_id: UUID, limit: int = 10
    ) -> List[asyncpg.Record]:
        return await self.conn.fetch(
            """
            SELECT * FROM sla_reports
            WHERE endpoint_id = $1
            ORDER BY created_at DESC
            LIMIT $2
            """,
            endpoint_id, limit,
        )

    async def create(
        self,
        endpoint_id: UUID,
        period_start: datetime,
        period_end: datetime,
        availability_percent: float,
        error_rate_percent: float,
        avg_latency_ms: float,
    ) -> asyncpg.Record:
        return await self.conn.fetchrow(
            """
            INSERT INTO sla_reports
                (endpoint_id, period_start, period_end,
                 availability_percent, error_rate_percent, avg_latency_ms)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *
            """,
            endpoint_id, period_start, period_end,
            availability_percent, error_rate_percent, avg_latency_ms,
        )