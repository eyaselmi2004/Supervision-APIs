from datetime import datetime, timedelta, timezone
from uuid import UUID

import asyncpg
from fastapi import HTTPException


class LLMContextService:
    """
    Builds rich monitoring context before sending data to the LLM.
    This keeps the LLM route clean and prevents the frontend from sending fake/manual metrics.
    """

    def __init__(self, conn: asyncpg.Connection):
        self.conn = conn

    async def build_endpoint_issue_context(
        self,
        endpoint_id: UUID,
        period_hours: int = 24,
    ) -> dict:
        period_end = datetime.now(timezone.utc)
        period_start = period_end - timedelta(hours=period_hours)

        endpoint = await self.conn.fetchrow(
            """
            SELECT
                e.id AS endpoint_id,
                e.path,
                e.method,
                e.is_active,
                s.id AS service_id,
                s.name AS service_name,
                s.base_url,
                s.project_id
            FROM endpoints e
            JOIN api_services s ON s.id = e.api_service_id
            WHERE e.id = $1
            """,
            endpoint_id,
        )

        if not endpoint:
            raise HTTPException(status_code=404, detail="Endpoint introuvable")

        stats = await self.conn.fetchrow(
            """
            SELECT
                COUNT(*)::BIGINT AS total_requests,
                COUNT(*) FILTER (WHERE success = TRUE)::BIGINT AS success_count,
                COUNT(*) FILTER (WHERE status_code >= 400)::BIGINT AS error_count,
                AVG(response_time_ms)::DOUBLE PRECISION AS avg_latency_ms,
                MIN(response_time_ms)::DOUBLE PRECISION AS min_latency_ms,
                MAX(response_time_ms)::DOUBLE PRECISION AS max_latency_ms,
                PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY response_time_ms) AS p95_latency_ms
            FROM api_metrics
            WHERE endpoint_id = $1
              AND timestamp >= $2
              AND timestamp <= $3
            """,
            endpoint_id,
            period_start,
            period_end,
        )

        status_rows = await self.conn.fetch(
            """
            SELECT status_code, COUNT(*)::BIGINT AS count
            FROM api_metrics
            WHERE endpoint_id = $1
              AND timestamp >= $2
              AND timestamp <= $3
            GROUP BY status_code
            ORDER BY count DESC
            """,
            endpoint_id,
            period_start,
            period_end,
        )

        recent_failures = await self.conn.fetch(
            """
            SELECT timestamp, status_code, response_time_ms
            FROM api_metrics
            WHERE endpoint_id = $1
              AND status_code >= 400
            ORDER BY timestamp DESC
            LIMIT 10
            """,
            endpoint_id,
        )

        recent_alerts = await self.conn.fetch(
            """
            SELECT
                a.id,
                a.message,
                a.severity::TEXT AS severity,
                a.status::TEXT AS status,
                a.created_at
            FROM alerts a
            JOIN alert_rules ar ON ar.id = a.rule_id
            WHERE ar.endpoint_id = $1
            ORDER BY a.created_at DESC
            LIMIT 5
            """,
            endpoint_id,
        )

        total_requests = int(stats["total_requests"] or 0)
        success_count = int(stats["success_count"] or 0)
        error_count = int(stats["error_count"] or 0)
        error_rate = round((error_count / total_requests * 100), 2) if total_requests > 0 else 0.0

        return {
            "endpoint": {
                "id": str(endpoint["endpoint_id"]),
                "method": str(endpoint["method"]),
                "path": str(endpoint["path"]),
                "is_active": bool(endpoint["is_active"]),
            },
            "service": {
                "id": str(endpoint["service_id"]),
                "name": str(endpoint["service_name"]),
                "base_url": str(endpoint["base_url"]),
                "project_id": str(endpoint["project_id"]) if endpoint["project_id"] else None,
            },
            "period": {
                "hours": period_hours,
                "start": period_start.isoformat(),
                "end": period_end.isoformat(),
                "generated_at": period_end.isoformat(),
            },
            "metrics_summary": {
                "total_requests": total_requests,
                "success_count": success_count,
                "error_count": error_count,
                "error_rate_percent": error_rate,
                "avg_latency_ms": round(float(stats["avg_latency_ms"] or 0), 2),
                "min_latency_ms": round(float(stats["min_latency_ms"] or 0), 2),
                "max_latency_ms": round(float(stats["max_latency_ms"] or 0), 2),
                "p95_latency_ms": round(float(stats["p95_latency_ms"] or 0), 2),
            },
            "status_code_distribution": {
                str(row["status_code"]): int(row["count"])
                for row in status_rows
            },
            "recent_failed_requests": [
                {
                    "timestamp": row["timestamp"].isoformat(),
                    "status_code": int(row["status_code"]),
                    "response_time_ms": round(float(row["response_time_ms"] or 0), 2),
                }
                for row in recent_failures
            ],
            "recent_alerts": [
                {
                    "id": str(row["id"]),
                    "message": str(row["message"]),
                    "severity": str(row["severity"]),
                    "status": str(row["status"]),
                    "created_at": row["created_at"].isoformat(),
                }
                for row in recent_alerts
            ],
        }

    async def build_alert_context(self, alert_id: UUID) -> dict:
        alert = await self.conn.fetchrow(
            """
            SELECT
                a.id AS alert_id,
                a.message,
                a.severity::TEXT AS severity,
                a.status::TEXT AS status,
                a.created_at,
                ar.id AS rule_id,
                ar.name AS rule_name,
                ar.type::TEXT AS rule_type,
                ar.threshold,
                ar.window_seconds,
                e.id AS endpoint_id,
                e.path,
                e.method,
                s.id AS service_id,
                s.name AS service_name,
                s.base_url,
                s.project_id
            FROM alerts a
            JOIN alert_rules ar ON ar.id = a.rule_id
            JOIN endpoints e ON e.id = ar.endpoint_id
            JOIN api_services s ON s.id = e.api_service_id
            WHERE a.id = $1
            """,
            alert_id,
        )

        if not alert:
            raise HTTPException(status_code=404, detail="Alerte introuvable")

        endpoint_context = await self.build_endpoint_issue_context(
            endpoint_id=alert["endpoint_id"],
            period_hours=24,
        )

        return {
            "alert": {
                "id": str(alert["alert_id"]),
                "message": alert["message"],
                "severity": alert["severity"],
                "status": alert["status"],
                "created_at": alert["created_at"].isoformat(),
            },
            "rule": {
                "id": str(alert["rule_id"]),
                "name": alert["rule_name"],
                "type": alert["rule_type"],
                "threshold": float(alert["threshold"]),
                "window_seconds": int(alert["window_seconds"]),
            },
            "endpoint_context": endpoint_context,
        }

    async def build_incident_context(
        self,
        incident_id: UUID,
        period_hours: int = 24,
    ) -> dict:
        period_end = datetime.now(timezone.utc)
        period_start = period_end - timedelta(hours=period_hours)

        incident = await self.conn.fetchrow(
            """
            SELECT
                i.id,
                i.title,
                i.status::TEXT AS status,
                i.start_time,
                i.end_time,
                i.resolution,
                i.source_alert_id,
                aps.id AS api_service_id,
                aps.name AS api_service_name,
                aps.base_url,
                p.id AS project_id,
                p.name AS project_name
            FROM incidents i
            JOIN api_services aps ON aps.id = i.api_service_id
            JOIN projects p ON p.id = aps.project_id
            WHERE i.id = $1
            """,
            incident_id,
        )

        if not incident:
            raise HTTPException(status_code=404, detail="Incident introuvable")

        endpoints = await self.conn.fetch(
            """
            SELECT
                e.id,
                e.path,
                e.method,
                COUNT(m.id)::BIGINT AS total_requests,
                COUNT(m.id) FILTER (WHERE m.status_code >= 400)::BIGINT AS error_count,
                AVG(m.response_time_ms)::DOUBLE PRECISION AS avg_latency_ms,
                PERCENTILE_CONT(0.95)
                    WITHIN GROUP (ORDER BY m.response_time_ms)
                    AS p95_latency_ms
            FROM endpoints e
            LEFT JOIN api_metrics m
                ON m.endpoint_id = e.id
               AND m.timestamp >= $2
               AND m.timestamp <= $3
            WHERE e.api_service_id = $1
            GROUP BY e.id
            ORDER BY error_count DESC NULLS LAST, avg_latency_ms DESC NULLS LAST
            LIMIT 10
            """,
            incident["api_service_id"],
            period_start,
            period_end,
        )

        alerts = await self.conn.fetch(
            """
            SELECT
                a.id,
                a.message,
                a.severity::TEXT AS severity,
                a.status::TEXT AS status,
                a.created_at,
                ar.name AS rule_name,
                ar.type::TEXT AS rule_type,
                e.path,
                e.method
            FROM alerts a
            JOIN alert_rules ar ON ar.id = a.rule_id
            JOIN endpoints e ON e.id = ar.endpoint_id
            WHERE e.api_service_id = $1
            ORDER BY a.created_at DESC
            LIMIT 10
            """,
            incident["api_service_id"],
        )

        return {
            "incident": {
                "id": str(incident["id"]),
                "title": incident["title"],
                "status": incident["status"],
                "start_time": incident["start_time"].isoformat() if incident["start_time"] else None,
                "end_time": incident["end_time"].isoformat() if incident["end_time"] else None,
                "resolution": incident["resolution"],
                "source_alert_id": str(incident["source_alert_id"]) if incident["source_alert_id"] else None,
            },
            "project": {
                "id": str(incident["project_id"]),
                "name": incident["project_name"],
            },
            "api_service": {
                "id": str(incident["api_service_id"]),
                "name": incident["api_service_name"],
                "base_url": incident["base_url"],
            },
            "period": {
                "hours": period_hours,
                "start": period_start.isoformat(),
                "end": period_end.isoformat(),
                "generated_at": period_end.isoformat(),
            },
            "top_problematic_endpoints": [
                {
                    "id": str(row["id"]),
                    "method": row["method"],
                    "path": row["path"],
                    "total_requests": int(row["total_requests"] or 0),
                    "error_count": int(row["error_count"] or 0),
                    "error_rate_percent": round(
                        (int(row["error_count"] or 0) / int(row["total_requests"] or 1)) * 100,
                        2,
                    ) if int(row["total_requests"] or 0) > 0 else 0,
                    "avg_latency_ms": round(float(row["avg_latency_ms"] or 0), 2),
                    "p95_latency_ms": round(float(row["p95_latency_ms"] or 0), 2),
                }
                for row in endpoints
            ],
            "recent_alerts": [
                {
                    "id": str(row["id"]),
                    "message": row["message"],
                    "severity": row["severity"],
                    "status": row["status"],
                    "created_at": row["created_at"].isoformat(),
                    "rule_name": row["rule_name"],
                    "rule_type": row["rule_type"],
                    "endpoint": f"{row['method']} {row['path']}",
                }
                for row in alerts
            ],
        }