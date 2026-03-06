from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
import asyncpg

from app.core.database import get_conn
from app.core.security import get_current_user_id
from app.repositories.alert_repository import AlertRepository
from app.services.alert_service import AlertService
from app.schemas.schemas import (
    AlertRuleCreate, AlertRuleUpdate, AlertRuleResponse,
    AlertResponse, AlertAcknowledgeRequest, MessageResponse,
)

router = APIRouter(tags=["Alerts"])


# alertRule

@router.get("/alert-rules", response_model=List[AlertRuleResponse])
async def list_rules(
    conn: asyncpg.Connection = Depends(get_conn),
    _: str = Depends(get_current_user_id),
):
    rows = await AlertRepository(conn).get_all_rules()
    return [dict(r) for r in rows]


@router.post("/alert-rules", response_model=AlertRuleResponse, status_code=status.HTTP_201_CREATED)
async def create_rule(
    data: AlertRuleCreate,
    conn: asyncpg.Connection = Depends(get_conn),
    user_id: str = Depends(get_current_user_id),
):
    row = await AlertRepository(conn).create_rule(
        name=data.name,
        rule_type=data.type.value,
        threshold=data.threshold,
        window_seconds=data.window_seconds,
        endpoint_id=data.endpoint_id,
        owner_id=UUID(user_id),
    )
    return dict(row)


@router.put("/alert-rules/{rule_id}", response_model=AlertRuleResponse)
async def update_rule(
    rule_id: UUID,
    data: AlertRuleUpdate,
    conn: asyncpg.Connection = Depends(get_conn),
    _: str = Depends(get_current_user_id),
):
    row = await AlertRepository(conn).update_rule(
        rule_id, data.name, data.threshold, data.window_seconds, data.is_enabled
    )
    if not row:
        raise HTTPException(status_code=404, detail="Règle introuvable")
    return dict(row)


@router.delete("/alert-rules/{rule_id}", response_model=MessageResponse)
async def delete_rule(
    rule_id: UUID,
    conn: asyncpg.Connection = Depends(get_conn),
    _: str = Depends(get_current_user_id),
):
    deleted = await AlertRepository(conn).delete_rule(rule_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Règle introuvable")
    return MessageResponse(message="Règle supprimée")


#alert

@router.get("/alerts", response_model=List[AlertResponse])
async def list_alerts(
    status_filter: Optional[str] = Query(None, alias="status"),
    severity: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    conn: asyncpg.Connection = Depends(get_conn),
    _: str = Depends(get_current_user_id),
):
    rows = await AlertRepository(conn).get_all_alerts(status_filter, severity, limit)
    return [dict(r) for r in rows]


@router.get("/alerts/{alert_id}", response_model=AlertResponse)
async def get_alert(
    alert_id: UUID,
    conn: asyncpg.Connection = Depends(get_conn),
    _: str = Depends(get_current_user_id),
):
    row = await AlertRepository(conn).get_alert_by_id(alert_id)
    if not row:
        raise HTTPException(status_code=404, detail="Alerte introuvable")
    return dict(row)


@router.post("/alerts/{alert_id}/acknowledge", response_model=AlertResponse)
async def acknowledge_alert(
    alert_id: UUID,
    data: AlertAcknowledgeRequest,
    conn: asyncpg.Connection = Depends(get_conn),
    _: str = Depends(get_current_user_id),
):
    row = await AlertService(conn).acknowledge(alert_id, data.user_id)
    return dict(row)


@router.post("/alerts/{alert_id}/resolve", response_model=AlertResponse)
async def resolve_alert(
    alert_id: UUID,
    conn: asyncpg.Connection = Depends(get_conn),
    _: str = Depends(get_current_user_id),
):
    row = await AlertService(conn).resolve(alert_id)
    return dict(row)
