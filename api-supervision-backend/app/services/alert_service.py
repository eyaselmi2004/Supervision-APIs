"""
alert_service.py — Service de gestion des alertes
"""

from datetime import datetime, timezone, timedelta
from uuid import UUID
import asyncio

import asyncpg
from fastapi import HTTPException

from app.repositories.alert_repository import AlertRepository
from app.repositories.metric_repository import MetricRepository
from app.services.notification_service import NotificationService


class AlertService:

    def __init__(self, conn: asyncpg.Connection):
        self.conn = conn
        self.repo = AlertRepository(conn)
        self.notif = NotificationService()

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
        rules = await self.repo.get_all_rules()

        print(f"\n{'='*50}")
        print(f"DEBUG evaluate_rules()")
        print(f"endpoint_id reçu   : {endpoint_id}")
        print(f"nombre règles total: {len(rules)}")

        # ── DEBUG : vérifie les métriques directement en base ──
        test = await self.conn.fetch(
            """
            SELECT
                COUNT(*)         AS total,
                MIN(timestamp)   AS premiere,
                MAX(timestamp)   AS derniere
            FROM api_metrics
            WHERE endpoint_id = $1
            """,
            endpoint_id
        )
        print(f"DEBUG — métriques en base pour cet endpoint:")
        for r in test:
            print(f"  total    : {r['total']}")
            print(f"  première : {r['premiere']}")
            print(f"  dernière : {r['derniere']}")

        # ── DEBUG : vérifie les 3 dernières métriques ──
        last_metrics = await self.conn.fetch(
            """
            SELECT timestamp, response_time_ms, success, status_code
            FROM api_metrics
            WHERE endpoint_id = $1
            ORDER BY timestamp DESC
            LIMIT 3
            """,
            endpoint_id
        )
        print(f"DEBUG — 3 dernières métriques :")
        for m in last_metrics:
            print(f"  {m['timestamp']} | {m['response_time_ms']}ms | success={m['success']} | {m['status_code']}")

        print(f"{'='*50}\n")

        # Filtre les règles actives pour cet endpoint
        rules = [
            r for r in rules
            if str(r["endpoint_id"]) == str(endpoint_id)
            and r["is_enabled"]
        ]

        print(f"DEBUG — règles filtrées : {len(rules)}")

        metric_repo = MetricRepository(self.conn)
        created_alerts = []

        for rule in rules:
            now          = datetime.now(timezone.utc)
            period_start = now - timedelta(seconds=rule["window_seconds"])

            print(f"DEBUG — fenêtre analyse : {period_start} → {now}")

            # ── DEBUG : compte les métriques dans la fenêtre ──
            count_in_window = await self.conn.fetchval(
                """
                SELECT COUNT(*)
                FROM api_metrics
                WHERE endpoint_id = $1
                  AND timestamp >= $2
                  AND timestamp <  $3
                """,
                endpoint_id, period_start, now
            )
            print(f"DEBUG — métriques dans la fenêtre : {count_in_window}")

            stats = await metric_repo.get_stats(endpoint_id, period_start, now)

            print(f"DEBUG — stats : {dict(stats) if stats else None}")

            if not stats or not stats["total_requests"]:
                print("DEBUG — pas de métriques → règle ignorée")
                continue

            total       = int(stats["total_requests"])
            errors      = int(stats["error_count"] or 0)
            avg_latency = float(stats["avg_response_time_ms"] or 0)
            error_rate  = round(errors / total * 100, 2) if total > 0 else 0.0

            print(f"DEBUG — avg_latency={avg_latency}ms | error_rate={error_rate}% | seuil={rule['threshold']}")

            violated = False
            message  = ""
            severity = "WARNING"

            if rule["type"] == "LATENCY" and avg_latency > rule["threshold"]:
                violated = True
                message  = (
                    f"Latence moyenne {avg_latency:.0f}ms "
                    f"depasse le seuil de {rule['threshold']}ms"
                )
                severity = "CRITICAL" if avg_latency > rule["threshold"] * 2 else "WARNING"
                print(f"DEBUG — VIOLATION LATENCY ! severity={severity}")

            elif rule["type"] == "ERROR_RATE" and error_rate > rule["threshold"]:
                violated = True
                message  = (
                    f"Taux d'erreur {error_rate}% "
                    f"depasse le seuil de {rule['threshold']}%"
                )
                severity = "CRITICAL" if error_rate > 50 else "WARNING"
                print(f"DEBUG — VIOLATION ERROR_RATE ! severity={severity}")

            if violated:
                alert      = await self.repo.create_alert(rule["id"], message, severity)
                alert_dict = dict(alert)
                print(f"DEBUG — alerte créée : {alert_dict['id']}")

                if severity == "CRITICAL":
                    await self._create_incident_from_alert(alert)
                    print("DEBUG — incident CRITICAL créé")

                asyncio.create_task(
                    self.notif.send_alert_notifications(alert_dict)
                )
                print("DEBUG — notification lancée")

                created_alerts.append(alert_dict)

        print(f"DEBUG — total alertes créées : {len(created_alerts)}")
        return created_alerts

    async def create_from_rule_violation(
        self, rule_id: UUID, message: str, severity: str
    ) -> asyncpg.Record:
        alert = await self.repo.create_alert(rule_id, message, severity)
        if severity == "CRITICAL":
            await self._create_incident_from_alert(alert)
        asyncio.create_task(
            self.notif.send_alert_notifications(dict(alert))
        )
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