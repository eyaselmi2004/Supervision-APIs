from uuid import UUID

import asyncpg
from fastapi import HTTPException

from app.repositories.sla_repository import SlaRepository
from app.repositories.metric_repository import MetricRepository
from app.schemas.schemas import SlaReportCreate


class SlaService:
    def __init__(self, conn: asyncpg.Connection):
        self.conn = conn

    async def compute_and_save(self, data: SlaReportCreate) -> asyncpg.Record:
        metric_repo = MetricRepository(self.conn)
        row = await metric_repo.get_stats(
            data.endpoint_id, data.period_start, data.period_end
        )

        total = int(row["total_requests"] or 0)
        if total == 0:
            raise HTTPException(
                status_code=400,
                detail="Aucune metrique sur cette periode",
            )

        errors = int(row["error_count"] or 0)
        error_rate = round(errors / total * 100, 2)
        availability = round(100 - error_rate, 2)
        avg_latency = round(float(row["avg_response_time_ms"] or 0), 2)

        sla_repo = SlaRepository(self.conn)
        return await sla_repo.create(
            endpoint_id=data.endpoint_id,
            period_start=data.period_start,
            period_end=data.period_end,
            availability_percent=availability,
            error_rate_percent=error_rate,
            avg_latency_ms=avg_latency,
        )