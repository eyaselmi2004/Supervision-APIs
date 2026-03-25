from datetime import datetime
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Query, status
import asyncpg

from app.core.database import get_conn
from app.core.security import get_current_user_id
from app.services.metric_service import MetricService
from app.schemas.schemas import (
    MetricsBatchCreate, ApiMetricResponse, MessageResponse,
)

router = APIRouter(prefix="/metrics", tags=["Metrics"])


@router.post("/batch", response_model=MessageResponse, status_code=status.HTTP_201_CREATED)
async def ingest_batch(
    data: MetricsBatchCreate,
    conn: asyncpg.Connection = Depends(get_conn),
    _: str = Depends(get_current_user_id),
):
    count = await MetricService(conn).ingest_batch(data)
    return MessageResponse(message=f"{count} metriques enregistrees")


@router.get("/endpoint/{endpoint_id}", response_model=List[ApiMetricResponse])
async def get_metrics(
    endpoint_id: UUID,
    limit: int = Query(100, ge=1, le=1000),
    since: Optional[datetime] = Query(None),
    conn: asyncpg.Connection = Depends(get_conn),
    _: str = Depends(get_current_user_id),
):
    return await MetricService(conn).get_by_endpoint(endpoint_id, limit, since)


@router.get("/endpoint/{endpoint_id}/stats")
async def get_stats(
    endpoint_id: UUID,
    period_start: datetime = Query(...),
    period_end: datetime = Query(...),
    conn: asyncpg.Connection = Depends(get_conn),
    _: str = Depends(get_current_user_id),
):
    return await MetricService(conn).compute_stats(endpoint_id, period_start, period_end)


@router.get("/endpoint/{endpoint_id}/time-series")
async def get_time_series(
    endpoint_id: UUID,
    period_start: datetime = Query(...),
    period_end: datetime = Query(...),
    bucket_interval: str = Query("1 hour"),
    conn: asyncpg.Connection = Depends(get_conn),
    _: str = Depends(get_current_user_id),
):
    return await MetricService(conn).get_time_series(
        endpoint_id, period_start, period_end, bucket_interval
    )