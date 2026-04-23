"""
app/api/v1/endpoints/metrics.py
Metrics ingestion and analytics endpoints.
"""

from datetime import datetime, timedelta, timezone
import re
from typing import Optional
from uuid import UUID

import asyncpg
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel

from app.core.database import get_conn

router = APIRouter(prefix="/metrics", tags=["Metrics"])

_ALLOWED_BUCKET = re.compile(r"^\s*\d+\s+(minute|minutes|hour|hours|day|days)\s*$", re.IGNORECASE)


class MetricData(BaseModel):
    api_service_id: str
    endpoint_path: str
    method: str
    timestamp: Optional[str] = None
    response_time_ms: float
    status_code: int


def _as_utc(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def _parse_iso_datetime(value: Optional[str]) -> Optional[datetime]:
    if not value:
        return None

    text = value.strip()
    if not text:
        return None

    if text.endswith("Z"):
        text = f"{text[:-1]}+00:00"

    try:
        parsed = datetime.fromisoformat(text)
    except ValueError:
        return None

    return _as_utc(parsed)


def _db_timestamptz(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def _resolve_period(
    period_start: Optional[str],
    period_end: Optional[str],
    default_hours: int = 24,
) -> tuple[datetime, datetime]:
    end_dt = _parse_iso_datetime(period_end) or datetime.now(timezone.utc)
    start_dt = _parse_iso_datetime(period_start) or (end_dt - timedelta(hours=default_hours))

    if start_dt >= end_dt:
        start_dt = end_dt - timedelta(hours=default_hours)

    return start_dt, end_dt


def _normalize_bucket_interval(bucket_interval: Optional[str]) -> str:
    if not bucket_interval:
        return "hour"

    cleaned = bucket_interval.strip().lower()

    if "minute" in cleaned:
        return "minute"
    if "day" in cleaned:
        return "day"

    return "hour"


def _metric_method(value: str) -> str:
    return (value or "GET").upper().strip()


@router.post("/agent")
async def receive_metric(
    data: MetricData,
    conn: asyncpg.Connection = Depends(get_conn),
):
    """
    Receive one metric from the supervision middleware and store it
    in the migration-based schema:
    - endpoints(api_service_id, path, method, ...)
    - api_metrics(endpoint_id, timestamp, response_time_ms, status_code, success)
    """
    print("[METRIC] received")

    try:
        api_uuid = UUID(data.api_service_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail="Invalid UUID") from exc

    try:
        api_service = await conn.fetchrow(
            """
            SELECT id
            FROM api_services
            WHERE id = $1
            """,
            api_uuid,
        )
        if not api_service:
            raise HTTPException(status_code=404, detail="API Service not found")

        method = _metric_method(data.method)
        metric_timestamp = _parse_iso_datetime(data.timestamp) or datetime.now(timezone.utc)
        metric_timestamp = _db_timestamptz(metric_timestamp)
        success = int(data.status_code) < 400

        endpoint = await conn.fetchrow(
            """
            INSERT INTO endpoints (api_service_id, path, method, is_active)
            VALUES ($1, $2, $3, TRUE)
            ON CONFLICT (api_service_id, path, method)
            DO UPDATE SET is_active = TRUE
            RETURNING id, api_service_id, path, method
            """,
            api_uuid,
            data.endpoint_path,
            method,
        )

        endpoint_id = endpoint["id"]

        metric_id = await conn.fetchval(
            """
            INSERT INTO api_metrics
                (endpoint_id, timestamp, response_time_ms, status_code, success)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING id
            """,
            endpoint_id,
            metric_timestamp,
            float(data.response_time_ms),
            int(data.status_code),
            success,
        )

        return {
            "status": "success",
            "metric_id": str(metric_id),
            "endpoint_id": str(endpoint_id),
            "message": "Metric recorded",
        }

    except HTTPException:
        raise
    except Exception as exc:
        print(f"[METRIC] processing failed: {exc}")
        raise HTTPException(status_code=500, detail=f"Metric ingestion failed: {exc}") from exc


@router.get("/api/{api_id}")
async def get_api_metrics(
    api_id: str,
    limit: int = Query(100, ge=1, le=1000),
    conn: asyncpg.Connection = Depends(get_conn),
):
    """
    Get recent raw metrics for one API service.
    """
    try:
        api_uuid = UUID(api_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail="Invalid UUID") from exc

    try:
        results = await conn.fetch(
            """
            SELECT
                m.id,
                m.timestamp,
                m.response_time_ms,
                m.status_code,
                m.success,
                e.id AS endpoint_id,
                e.path AS endpoint_path,
                e.method
            FROM api_metrics m
            JOIN endpoints e ON e.id = m.endpoint_id
            WHERE e.api_service_id = $1
            ORDER BY m.timestamp DESC
            LIMIT $2
            """,
            api_uuid,
            limit,
        )

        return {
            "api_id": api_id,
            "count": len(results),
            "metrics": [dict(row) for row in results],
        }
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Unable to fetch metrics: {exc}") from exc


@router.get("/api/{api_id}/stats")
async def get_api_stats(
    api_id: str,
    conn: asyncpg.Connection = Depends(get_conn),
):
    """
    Get high-level stats for one API service (last hour).
    """
    try:
        api_uuid = UUID(api_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail="Invalid UUID") from exc

    try:
        stats = await conn.fetchrow(
            """
            SELECT
                COUNT(*)::BIGINT AS total_requests,
                AVG(m.response_time_ms)::DOUBLE PRECISION AS avg_response_time,
                MAX(m.response_time_ms)::DOUBLE PRECISION AS max_response_time,
                MIN(m.response_time_ms)::DOUBLE PRECISION AS min_response_time,
                COUNT(*) FILTER (WHERE m.status_code >= 400)::DOUBLE PRECISION AS error_count
            FROM api_metrics m
            JOIN endpoints e ON e.id = m.endpoint_id
            WHERE e.api_service_id = $1
              AND m.timestamp > NOW() - INTERVAL '1 hour'
            """,
            api_uuid,
        )

        total_requests = int(stats["total_requests"] or 0)
        error_count = float(stats["error_count"] or 0.0)
        error_rate_percent = (error_count / total_requests * 100.0) if total_requests > 0 else 0.0

        return {
            "api_id": api_id,
            "total_requests": total_requests,
            "avg_response_time": round(float(stats["avg_response_time"] or 0.0), 2),
            "max_response_time": float(stats["max_response_time"] or 0.0),
            "min_response_time": float(stats["min_response_time"] or 0.0),
            "error_rate_percent": round(error_rate_percent, 2),
            "period": "Last 1 hour",
        }
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Unable to fetch API stats: {exc}") from exc


@router.get("/endpoint/{endpoint_id}")
async def get_endpoint_metrics(
    endpoint_id: str,
    limit: int = Query(100, ge=1, le=1000),
    conn: asyncpg.Connection = Depends(get_conn),
):
    """
    Get recent raw metrics for one endpoint.
    """
    try:
        endpoint_uuid = UUID(endpoint_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail="Invalid endpoint UUID") from exc

    try:
        endpoint = await conn.fetchrow(
            """
            SELECT id, api_service_id, path, method
            FROM endpoints
            WHERE id = $1
            """,
            endpoint_uuid,
        )

        if not endpoint:
            raise HTTPException(status_code=404, detail="Endpoint not found")

        rows = await conn.fetch(
            """
            SELECT id, timestamp, response_time_ms, status_code, success
            FROM api_metrics
            WHERE endpoint_id = $1
            ORDER BY timestamp DESC
            LIMIT $2
            """,
            endpoint_uuid,
            limit,
        )

        return [
            {
                "id": str(row["id"]),
                "endpoint_id": endpoint_id,
                "timestamp": row["timestamp"],
                "response_time_ms": float(row["response_time_ms"] or 0.0),
                "status_code": int(row["status_code"] or 0),
                "success": bool(row["success"]),
            }
            for row in rows
        ]

    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Unable to fetch endpoint metrics: {exc}") from exc


@router.get("/endpoint/{endpoint_id}/stats")
async def get_endpoint_stats(
    endpoint_id: str,
    period_start: Optional[str] = Query(None),
    period_end: Optional[str] = Query(None),
    conn: asyncpg.Connection = Depends(get_conn),
):
    """
    Get endpoint KPIs for the selected period.
    """
    try:
        endpoint_uuid = UUID(endpoint_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail="Invalid endpoint UUID") from exc

    try:
        endpoint = await conn.fetchrow(
            """
            SELECT id, api_service_id, path, method
            FROM endpoints
            WHERE id = $1
            """,
            endpoint_uuid,
        )

        if not endpoint:
            raise HTTPException(status_code=404, detail="Endpoint not found")

        period_start_dt, period_end_dt = _resolve_period(period_start, period_end, default_hours=24)
        period_start_dt = _db_timestamptz(period_start_dt)
        period_end_dt = _db_timestamptz(period_end_dt)

        stats = await conn.fetchrow(
            """
            SELECT
                COUNT(*)::BIGINT AS total_requests,
                COUNT(*) FILTER (WHERE success = TRUE)::BIGINT AS success_count,
                COUNT(*) FILTER (WHERE status_code >= 400)::BIGINT AS error_count,
                AVG(response_time_ms)::DOUBLE PRECISION AS avg_response_time_ms,
                MIN(response_time_ms)::DOUBLE PRECISION AS min_response_time_ms,
                MAX(response_time_ms)::DOUBLE PRECISION AS max_response_time_ms,
                PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY response_time_ms) AS p95_latency_ms
            FROM api_metrics
            WHERE endpoint_id = $1
              AND timestamp >= $2
              AND timestamp <= $3
            """,
            endpoint_uuid,
            period_start_dt,
            period_end_dt,
        )

        total_requests = int(stats["total_requests"] or 0)
        success_count = int(stats["success_count"] or 0)
        error_count = int(stats["error_count"] or 0)
        avg_response_time_ms = float(stats["avg_response_time_ms"] or 0.0)
        min_response_time_ms = float(stats["min_response_time_ms"] or 0.0)
        max_response_time_ms = float(stats["max_response_time_ms"] or 0.0)
        p95_latency_ms = float(stats["p95_latency_ms"] or 0.0)
        error_rate_percent = (error_count / total_requests * 100.0) if total_requests > 0 else 0.0

        return {
            "endpoint_id": endpoint_id,
            "period_start": period_start_dt.isoformat(),
            "period_end": period_end_dt.isoformat(),
            "total_requests": total_requests,
            "success_count": success_count,
            "error_count": error_count,
            "avg_response_time_ms": round(avg_response_time_ms, 2),
            "min_response_time_ms": round(min_response_time_ms, 2),
            "max_response_time_ms": round(max_response_time_ms, 2),
            "p95_latency_ms": round(p95_latency_ms, 2),
            "error_rate_percent": round(error_rate_percent, 2),
            "avg_response_time": round(avg_response_time_ms, 2),
            "p95_latency": round(p95_latency_ms, 2),
            "error_rate": round(error_rate_percent, 2),
        }

    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Unable to compute endpoint stats: {exc}") from exc


@router.get("/endpoint/{endpoint_id}/time-series")
async def get_endpoint_time_series(
    endpoint_id: str,
    period_start: Optional[str] = Query(None),
    period_end: Optional[str] = Query(None),
    bucket_interval: Optional[str] = Query("1 hour"),
    conn: asyncpg.Connection = Depends(get_conn),
):
    """
    Get time-bucketed endpoint metrics for charts.
    """
    try:
        endpoint_uuid = UUID(endpoint_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail="Invalid endpoint UUID") from exc

    try:
        endpoint = await conn.fetchrow(
            """
            SELECT id, api_service_id, path, method
            FROM endpoints
            WHERE id = $1
            """,
            endpoint_uuid,
        )

        if not endpoint:
            raise HTTPException(status_code=404, detail="Endpoint not found")

        period_start_dt, period_end_dt = _resolve_period(period_start, period_end, default_hours=24)
        period_start_dt = _db_timestamptz(period_start_dt)
        period_end_dt = _db_timestamptz(period_end_dt)

        bucket_unit = _normalize_bucket_interval(bucket_interval)

        rows = await conn.fetch(
            f"""
            SELECT
                date_trunc('{bucket_unit}', timestamp) AS bucket,
                COUNT(*)::BIGINT AS total_requests,
                AVG(response_time_ms)::DOUBLE PRECISION AS avg_response_time_ms,
                COUNT(*) FILTER (WHERE status_code >= 400)::BIGINT AS error_count
            FROM api_metrics
            WHERE endpoint_id = $1
              AND timestamp >= $2
              AND timestamp <= $3
            GROUP BY 1
            ORDER BY 1 ASC
            """,
            endpoint_uuid,
            period_start_dt,
            period_end_dt,
        )

        result = []
        for row in rows:
            total_requests = int(row["total_requests"] or 0)
            error_count = int(row["error_count"] or 0)
            error_rate_percent = (error_count / total_requests * 100.0) if total_requests > 0 else 0.0
            bucket_value = row["bucket"]
            bucket_iso = bucket_value.isoformat() if isinstance(bucket_value, datetime) else str(bucket_value)

            result.append(
                {
                    "bucket": bucket_iso,
                    "total_requests": total_requests,
                    "avg_response_time_ms": round(float(row["avg_response_time_ms"] or 0.0), 2),
                    "error_count": error_count,
                    "error_rate_percent": round(error_rate_percent, 2),
                }
            )

        return result

    except HTTPException:
        raise
    except Exception as exc:
        print(f"[METRIC] time-series failed: {exc}")
        raise HTTPException(status_code=500, detail=f"Unable to compute time series: {exc}") from exc