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


def _db_naive_utc(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value
    return value.astimezone(timezone.utc).replace(tzinfo=None)

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
        return "1 hour"

    cleaned = bucket_interval.strip().lower()
    if not _ALLOWED_BUCKET.match(cleaned):
        return "1 hour"

    return cleaned


def _metric_method(value: str) -> str:
    return (value or "GET").upper().strip()


@router.post("/agent")
async def receive_metric(
    data: MetricData,
    conn: asyncpg.Connection = Depends(get_conn),
):
    """
    Receive one metric from the supervision middleware.
    """
    print("[METRIC] received")

    try:
        api_uuid = UUID(data.api_service_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail="Invalid UUID") from exc

    try:
        api_service = await conn.fetchval(
            "SELECT id FROM api_services WHERE id = $1",
            api_uuid,
        )

        if not api_service:
            raise HTTPException(status_code=404, detail="API Service not found")

        method = _metric_method(data.method)
        metric_timestamp = _parse_iso_datetime(data.timestamp) or datetime.now(timezone.utc)
        metric_timestamp = _db_naive_utc(metric_timestamp)

        try:
            await conn.execute(
                """
                INSERT INTO endpoints (id, api_service_id, path, method, is_active, created_at)
                VALUES (gen_random_uuid(), $1, $2, $3, true, NOW())
                ON CONFLICT (api_service_id, path, method) DO NOTHING
                """,
                api_uuid,
                data.endpoint_path,
                method,
            )
        except Exception as endpoint_error:
            print(f"[METRIC] endpoint upsert failed (non-blocking): {endpoint_error}")

        metric_id = await conn.fetchval(
            """
            INSERT INTO metrics
                (api_service_id, endpoint_path, method, status_code, response_time_ms, timestamp, created_at)
            VALUES ($1, $2, $3, $4, $5, $6, NOW())
            RETURNING id
            """,
            api_uuid,
            data.endpoint_path,
            method,
            int(data.status_code),
            float(data.response_time_ms),
            metric_timestamp,
        )

        severity = None
        message = ""

        if data.status_code >= 500:
            severity = "CRITICAL"
            message = f"Server error ({data.status_code}) on {data.endpoint_path}"
        elif data.status_code >= 400:
            severity = "WARNING"
            message = f"Client error ({data.status_code}) on {data.endpoint_path}"
        elif data.response_time_ms > 2000:
            severity = "WARNING"
            message = f"Slow response ({data.response_time_ms:.2f}ms) on {data.endpoint_path}"

        if severity:
            try:
                await conn.execute(
                    """
                    INSERT INTO alerts
                        (api_service_id, message, severity, status, created_at)
                    VALUES ($1, $2, $3, 'OPEN', NOW())
                    """,
                    api_uuid,
                    message,
                    severity,
                )
            except Exception as alert_error:
                print(f"[METRIC] alert creation failed (non-blocking): {alert_error}")

        return {
            "status": "success",
            "metric_id": str(metric_id),
            "message": "Metric recorded",
        }

    except HTTPException:
        raise
    except Exception as exc:
        print(f"[METRIC] processing failed: {exc}")
        return {
            "status": "ignored",
            "message": "Metric received but could not be processed",
        }

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
            SELECT *
            FROM metrics
            WHERE api_service_id = $1
            ORDER BY timestamp DESC
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
                AVG(response_time_ms)::DOUBLE PRECISION AS avg_response_time,
                MAX(response_time_ms)::DOUBLE PRECISION AS max_response_time,
                MIN(response_time_ms)::DOUBLE PRECISION AS min_response_time,
                COUNT(*) FILTER (WHERE status_code >= 400)::DOUBLE PRECISION AS error_count
            FROM metrics
            WHERE api_service_id = $1
              AND timestamp > NOW() - INTERVAL '1 hour'
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
            SELECT id, timestamp, response_time_ms, status_code
            FROM metrics
            WHERE api_service_id = $1
              AND endpoint_path = $2
              AND method = $3
            ORDER BY timestamp DESC
            LIMIT $4
            """,
            endpoint["api_service_id"],
            endpoint["path"],
            endpoint["method"],
            limit,
        )

        return [
            {
                "id": str(row["id"]),
                "endpoint_id": endpoint_id,
                "timestamp": row["timestamp"],
                "response_time_ms": float(row["response_time_ms"] or 0.0),
                "status_code": int(row["status_code"] or 0),
                "success": int(row["status_code"] or 0) < 400,
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
        period_start_dt = _db_naive_utc(period_start_dt)
        period_end_dt = _db_naive_utc(period_end_dt)

        stats = await conn.fetchrow(
            """
            SELECT
                COUNT(*)::BIGINT AS total_requests,
                COUNT(*) FILTER (WHERE status_code < 400)::BIGINT AS success_count,
                COUNT(*) FILTER (WHERE status_code >= 400)::BIGINT AS error_count,
                AVG(response_time_ms)::DOUBLE PRECISION AS avg_response_time_ms,
                MIN(response_time_ms)::DOUBLE PRECISION AS min_response_time_ms,
                MAX(response_time_ms)::DOUBLE PRECISION AS max_response_time_ms,
                PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY response_time_ms) AS p95_latency_ms
            FROM metrics
            WHERE api_service_id = $1
              AND endpoint_path = $2
              AND method = $3
              AND timestamp >= $4
              AND timestamp <= $5
            """,
            endpoint["api_service_id"],
            endpoint["path"],
            endpoint["method"],
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
        period_start_dt = _db_naive_utc(period_start_dt)
        period_end_dt = _db_naive_utc(period_end_dt)
        bucket = _normalize_bucket_interval(bucket_interval)

        rows = await conn.fetch(
            """
            SELECT
                to_timestamp(
                    floor(extract(epoch from timestamp) / extract(epoch from $4::interval))
                    * extract(epoch from $4::interval)
                ) AS bucket,
                COUNT(*)::BIGINT AS total_requests,
                AVG(response_time_ms)::DOUBLE PRECISION AS avg_response_time_ms,
                COUNT(*) FILTER (WHERE status_code >= 400)::BIGINT AS error_count
            FROM metrics
            WHERE api_service_id = $1
              AND endpoint_path = $2
              AND method = $3
              AND timestamp >= $5
              AND timestamp <= $6
            GROUP BY bucket
            ORDER BY bucket ASC
            """,
            endpoint["api_service_id"],
            endpoint["path"],
            endpoint["method"],
            bucket,
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
        raise HTTPException(status_code=500, detail=f"Unable to compute time series: {exc}") from exc
