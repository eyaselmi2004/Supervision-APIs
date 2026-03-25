from datetime import datetime
from typing import List
from uuid import UUID

import asyncpg

from app.repositories.metric_repository import MetricRepository
from app.schemas.schemas import MetricsBatchCreate, ApiMetricResponse


class MetricService:
    def __init__(self, conn: asyncpg.Connection):
        self.conn = conn
        self.repo = MetricRepository(conn)

    async def ingest_batch(self, data: MetricsBatchCreate) -> int:
        """INSERT en masse optimisé — executemany asyncpg"""
        metrics = [
            {
                "endpoint_id": m.endpoint_id,
                "timestamp": m.timestamp,
                "response_time_ms": m.response_time_ms,
                "status_code": m.status_code,
                "success": m.success,
            }
            for m in data.metrics
        ]
        return await self.repo.create_bulk(metrics)

    async def get_by_endpoint(
        self,
        endpoint_id: UUID,
        limit: int = 100,
        since: datetime = None,
    ) -> List[dict]:
        rows = await self.repo.get_by_endpoint(endpoint_id, limit, since)
        return [dict(r) for r in rows]

    async def compute_stats(
        self,
        endpoint_id: UUID,
        period_start: datetime,
        period_end: datetime,
    ) -> dict:
        row = await self.repo.get_stats(endpoint_id, period_start, period_end)
        total = int(row["total_requests"] or 0)
        errors = int(row["error_count"] or 0)
        return {
            "endpoint_id": str(endpoint_id),
            "period_start": period_start.isoformat(),
            "period_end": period_end.isoformat(),
            "total_requests": total,
            "success_count": int(row["success_count"] or 0),
            "error_count": errors,
            "avg_response_time_ms": round(float(row["avg_response_time_ms"] or 0), 2),
            "min_response_time_ms": round(float(row["min_response_time_ms"] or 0), 2),
            "max_response_time_ms": round(float(row["max_response_time_ms"] or 0), 2),
            "error_rate_percent": round(errors / total * 100, 2) if total > 0 else 0.0,
        }

    async def get_time_series(
        self,
        endpoint_id: UUID,
        period_start: datetime,
        period_end: datetime,
        bucket_interval: str = "1 hour",
    ) -> list:
        rows = await self.repo.get_time_series(
            endpoint_id, period_start, period_end, bucket_interval
        )
        return [
            {
                "bucket": row["bucket"].isoformat(),
                "total_requests": int(row["total_requests"]),
                "avg_response_time_ms": round(float(row["avg_response_time_ms"] or 0), 2),
                "error_count": int(row["error_count"]),
            }
            for row in rows
        ]