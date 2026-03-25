from datetime import datetime, timezone
from typing import List, Optional
from uuid import UUID

import asyncpg


class AlertRepository:
    def __init__(self, conn: asyncpg.Connection):
        self.conn = conn

    # ── AlertRule ────────────────────────────────────────

    async def get_all_rules(self) -> List[asyncpg.Record]:
        return await self.conn.fetch(
            "SELECT * FROM alert_rules ORDER BY name"
        )

    async def get_rule_by_id(self, rule_id: UUID) -> Optional[asyncpg.Record]:
        return await self.conn.fetchrow(
            "SELECT * FROM alert_rules WHERE id = $1", rule_id
        )

    async def create_rule(
        self, name: str, rule_type: str, threshold: float,
        window_seconds: int, endpoint_id: UUID, owner_id: UUID,
    ) -> asyncpg.Record:
        return await self.conn.fetchrow(
            """
            INSERT INTO alert_rules
                (name, type, threshold, window_seconds, endpoint_id, owner_id)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *
            """,
            name, rule_type, threshold, window_seconds, endpoint_id, owner_id,
        )

    async def update_rule(
        self, rule_id: UUID,
        name: Optional[str] = None,
        threshold: Optional[float] = None,
        window_seconds: Optional[int] = None,
        is_enabled: Optional[bool] = None,
    ) -> Optional[asyncpg.Record]:
        fields, values, idx = [], [], 1
        if name is not None:
            fields.append(f"name = ${idx}"); values.append(name); idx += 1
        if threshold is not None:
            fields.append(f"threshold = ${idx}"); values.append(threshold); idx += 1
        if window_seconds is not None:
            fields.append(f"window_seconds = ${idx}"); values.append(window_seconds); idx += 1
        if is_enabled is not None:
            fields.append(f"is_enabled = ${idx}"); values.append(is_enabled); idx += 1
        if not fields:
            return await self.get_rule_by_id(rule_id)
        values.append(rule_id)
        return await self.conn.fetchrow(
            f"UPDATE alert_rules SET {', '.join(fields)} WHERE id = ${idx} RETURNING *",
            *values,
        )

    async def delete_rule(self, rule_id: UUID) -> bool:
        result = await self.conn.execute(
            "DELETE FROM alert_rules WHERE id = $1", rule_id
        )
        return result == "DELETE 1"

    # ── Alert ────────────────────────────────────────────

    async def get_all_alerts(
        self,
        status: Optional[str] = None,
        limit: int = 50,
    ) -> List[asyncpg.Record]:
        if status:
            return await self.conn.fetch(
                "SELECT * FROM alerts WHERE status = $1 ORDER BY created_at DESC LIMIT $2",
                status, limit,
            )
        return await self.conn.fetch(
            "SELECT * FROM alerts ORDER BY created_at DESC LIMIT $1", limit,
        )

    async def get_alert_by_id(self, alert_id: UUID) -> Optional[asyncpg.Record]:
        return await self.conn.fetchrow(
            "SELECT * FROM alerts WHERE id = $1", alert_id
        )

    async def create_alert(
        self, rule_id: UUID, message: str, severity: str
    ) -> asyncpg.Record:
        return await self.conn.fetchrow(
            """
            INSERT INTO alerts (rule_id, message, severity)
            VALUES ($1, $2, $3)
            RETURNING *
            """,
            rule_id, message, severity,
        )

    async def acknowledge(self, alert_id: UUID, user_id: UUID) -> Optional[asyncpg.Record]:
        return await self.conn.fetchrow(
            """
            UPDATE alerts
            SET status = 'ACKNOWLEDGED',
                acknowledged_at = $1,
                managed_by_id   = $2
            WHERE id = $3
            RETURNING *
            """,
            datetime.now(timezone.utc), user_id, alert_id,
        )

    async def resolve(self, alert_id: UUID) -> Optional[asyncpg.Record]:
        return await self.conn.fetchrow(
            """
            UPDATE alerts
            SET status = 'RESOLVED', resolved_at = $1
            WHERE id = $2
            RETURNING *
            """,
            datetime.now(timezone.utc), alert_id,
        )