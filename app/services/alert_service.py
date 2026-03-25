from datetime import datetime, timezone, timedelta
from uuid import UUID

import asyncpg
from fastapi import HTTPException

from app.repositories.alert_repository import AlertRepository
from app.repositories.metric_repository import MetricRepository


class AlertService:
    def __init__(self, conn: asyncpg.Connection):
        self.conn = conn
        self.repo = AlertRepository(conn)

    async def acknowledge(self, alert_id: UUID, user_id: UUID) -> asyncpg.Record:
        alert = await self.repo.get_alert_by_id(alert_id)
        if not alert:
            raise HTTPException(status_code=404, detail="Alerte introuvable")
        if alert["status"] != "OPEN":
            raise HTTPException(status_code=400, detail="Alerte deja traitee")
        return await self.repo.acknowledge(alert_id, user_id)

    async def resolve(self, alert_id: UUID) -> asyncpg.Record:
        alert = await self.repo.get_alert_by_id(alert_id)
        if not alert:
            raise HTTPException(status_code=404, detail="Alerte introuvable")
        if alert["status"] == "RESOLVED":
            raise HTTPException(status_code=400, detail="Alerte deja resolue")
        return await self.repo.resolve(alert_id)

    async def evaluate_rules(self, endpoint_id: UUID) -> list:
        """
        Vérifie toutes les règles actives d'un endpoint.
        Crée une alerte automatiquement si un seuil est dépassé.
        """
        rules = await self.repo.get_all_rules()
        rules = [r for r in rules if r["endpoint_id"] == endpoint_id and r["is_enabled"]]

        metric_repo = MetricRepository(self.conn)
        created_alerts = []

        for rule in rules:
            now = datetime.now(timezone.utc)
            period_start = now - timedelta(seconds=rule["window_seconds"])

            stats = await metric_repo.get_stats(endpoint_id, period_start, now)
            if not stats or not stats["total_requests"]:
                continue

            total = int(stats["total_requests"])
            errors = int(stats["error_count"] or 0)
            avg_latency = float(stats["avg_response_time_ms"] or 0)
            error_rate = round(errors / total * 100, 2) if total > 0 else 0.0

            violated = False
            message = ""
            severity = "WARNING"

            if rule["type"] == "LATENCY" and avg_latency > rule["threshold"]:
                violated = True
                message = f"Latence moyenne {avg_latency:.0f}ms depasse le seuil de {rule['threshold']}ms"
                severity = "CRITICAL" if avg_latency > rule["threshold"] * 2 else "WARNING"

            elif rule["type"] == "ERROR_RATE" and error_rate > rule["threshold"]:
                violated = True
                message = f"Taux d'erreur {error_rate}% depasse le seuil de {rule['threshold']}%"
                severity = "CRITICAL" if error_rate > 50 else "WARNING"

            if violated:
                alert = await self.repo.create_alert(rule["id"], message, severity)
                if severity == "CRITICAL":
                    await self._create_incident_from_alert(alert)
                created_alerts.append(dict(alert))

        return created_alerts

    async def create_from_rule_violation(
        self, rule_id: UUID, message: str, severity: str
    ) -> asyncpg.Record:
        alert = await self.repo.create_alert(rule_id, message, severity)
        if severity == "CRITICAL":
            await self._create_incident_from_alert(alert)
        return alert

    async def _create_incident_from_alert(self, alert: asyncpg.Record) -> None:
        rule = await self.conn.fetchrow(
            """
            SELECT ar.*, e.api_service_id
            FROM alert_rules ar
            JOIN endpoints e ON e.id = ar.endpoint_id
            WHERE ar.id = $1
            """,
            alert["rule_id"],
        )
        if not rule:
            return
        await self.conn.execute(
            """
            INSERT INTO incidents (title, api_service_id, source_alert_id)
            VALUES ($1, $2, $3)
            """,
            f"Incident automatique — {alert['message'][:200]}",
            rule["api_service_id"],
            alert["id"],
        )