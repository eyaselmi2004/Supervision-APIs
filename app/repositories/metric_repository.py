from datetime import datetime, timedelta
from typing import List, Optional
from uuid import UUID, uuid4

import asyncpg


class MetricRepository:
    def __init__(self, conn: asyncpg.Connection):
        self.conn = conn

    async def create_bulk(self, metrics: list) -> int:
        rows = [
            (uuid4(), m["endpoint_id"], m["timestamp"],
             m["response_time_ms"], m["status_code"], m["success"])
            for m in metrics
        ]
        await self.conn.executemany(
            """
            INSERT INTO api_metrics
                (id, endpoint_id, timestamp, response_time_ms, status_code, success)
            VALUES ($1, $2, $3, $4, $5, $6)
            """,
            rows,
        )
        return len(rows)

    async def get_by_endpoint(
        self,
        endpoint_id: UUID,
        limit: int = 100,
        since: Optional[datetime] = None,
    ) -> List[asyncpg.Record]:
        if since:
            return await self.conn.fetch(
                """
                SELECT * FROM api_metrics
                WHERE endpoint_id = $1 AND timestamp >= $2
                ORDER BY timestamp DESC
                LIMIT $3
                """,
                endpoint_id, since, limit,
            )
        return await self.conn.fetch(
            """
            SELECT * FROM api_metrics
            WHERE endpoint_id = $1
            ORDER BY timestamp DESC
            LIMIT $2
            """,
            endpoint_id, limit,
        )

    async def get_stats(
        self,
        endpoint_id: UUID,
        period_start: datetime,
        period_end: datetime,
    ) -> asyncpg.Record:
        return await self.conn.fetchrow(
            """
            SELECT
                COUNT(*)                                              AS total_requests,
                SUM(CASE WHEN success = TRUE  THEN 1 ELSE 0 END)    AS success_count,
                SUM(CASE WHEN success = FALSE THEN 1 ELSE 0 END)    AS error_count,
                AVG(response_time_ms)                                AS avg_response_time_ms,
                MIN(response_time_ms)                                AS min_response_time_ms,
                MAX(response_time_ms)                                AS max_response_time_ms
            FROM api_metrics
            WHERE endpoint_id = $1
              AND timestamp >= $2
              AND timestamp <  $3
            """,
            endpoint_id, period_start, period_end,
        )

    async def get_time_series(
        self,
        endpoint_id: UUID,
        period_start: datetime,
        period_end: datetime,
        bucket_interval: str = "1 hour",
    ) -> list:
        parts = bucket_interval.strip().split()
        value = int(parts[0])
        unit = parts[1].lower()
        if "minute" in unit:
            interval = timedelta(minutes=value)
        elif "hour" in unit:
            interval = timedelta(hours=value)
        elif "day" in unit:
            interval = timedelta(days=value)
        else:
            interval = timedelta(hours=1)

        return await self.conn.fetch(
            """
            SELECT
                time_bucket($1, timestamp)                            AS bucket,
                COUNT(*)                                              AS total_requests,
                AVG(response_time_ms)                                 AS avg_response_time_ms,
                SUM(CASE WHEN success = FALSE THEN 1 ELSE 0 END)     AS error_count
            FROM api_metrics
            WHERE endpoint_id = $2
              AND timestamp >= $3
              AND timestamp <  $4
            GROUP BY bucket
            ORDER BY bucket ASC
            """,
            interval, endpoint_id, period_start, period_end,
        )