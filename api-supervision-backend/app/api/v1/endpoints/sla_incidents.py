from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
import asyncpg

from app.core.database import get_conn
from app.core.security import get_current_user_id
from app.repositories.sla_repository import SlaRepository
from app.repositories.incident_repository import IncidentRepository
from app.repositories.notification_repository import NotificationRepository
from app.services.sla_service import SlaService
from app.schemas.schemas import (
    SlaReportCreate, SlaReportResponse,
    IncidentCreate, IncidentResolveRequest, IncidentResponse,
    NotificationChannelCreate, NotificationChannelUpdate,
    NotificationChannelResponse, MessageResponse,
)

router = APIRouter(tags=["SLA / Incidents / Notifications"])


# ── SLA ───────────────────────────────────────────────────

@router.get("/sla/endpoint/{endpoint_id}", response_model=List[SlaReportResponse])
async def get_sla_reports(
    endpoint_id: UUID,
    limit: int = Query(10, ge=1, le=100),
    conn: asyncpg.Connection = Depends(get_conn),
    _: str = Depends(get_current_user_id),
):
    rows = await SlaRepository(conn).get_by_endpoint(endpoint_id, limit)
    return [dict(r) for r in rows]


@router.post("/sla/compute", response_model=SlaReportResponse, status_code=status.HTTP_201_CREATED)
async def compute_sla(
    data: SlaReportCreate,
    conn: asyncpg.Connection = Depends(get_conn),
    _: str = Depends(get_current_user_id),
):
    row = await SlaService(conn).compute_and_save(data)
    return dict(row)


# ── Incidents ─────────────────────────────────────────────

def _build_incident_response(row: asyncpg.Record) -> dict:
    data = dict(row)
    if data.get("end_time") and data.get("start_time"):
        delta = data["end_time"] - data["start_time"]
        data["duration_minutes"] = round(delta.total_seconds() / 60, 2)
    else:
        data["duration_minutes"] = None
    return data


@router.get("/incidents", response_model=List[IncidentResponse])
async def list_incidents(
    conn: asyncpg.Connection = Depends(get_conn),
    _: str = Depends(get_current_user_id),
):
    rows = await IncidentRepository(conn).get_all()
    return [_build_incident_response(r) for r in rows]


@router.post("/incidents", response_model=IncidentResponse, status_code=status.HTTP_201_CREATED)
async def create_incident(
    data: IncidentCreate,
    conn: asyncpg.Connection = Depends(get_conn),
    _: str = Depends(get_current_user_id),
):
    row = await IncidentRepository(conn).create(
        title=data.title,
        api_service_id=data.api_service_id,
        source_alert_id=data.source_alert_id,
    )
    return _build_incident_response(row)


@router.get("/incidents/{incident_id}", response_model=IncidentResponse)
async def get_incident(
    incident_id: UUID,
    conn: asyncpg.Connection = Depends(get_conn),
    _: str = Depends(get_current_user_id),
):
    row = await IncidentRepository(conn).get_by_id(incident_id)
    if not row:
        raise HTTPException(status_code=404, detail="Incident introuvable")
    return _build_incident_response(row)


@router.post("/incidents/{incident_id}/resolve", response_model=IncidentResponse)
async def resolve_incident(
    incident_id: UUID,
    data: IncidentResolveRequest,
    conn: asyncpg.Connection = Depends(get_conn),
    _: str = Depends(get_current_user_id),
):
    row = await IncidentRepository(conn).resolve(incident_id, data.resolution)
    if not row:
        raise HTTPException(status_code=404, detail="Incident introuvable")
    return _build_incident_response(row)


# ── Notification Channels ─────────────────────────────────

@router.get("/notification-channels", response_model=List[NotificationChannelResponse])
async def list_channels(
    conn: asyncpg.Connection = Depends(get_conn),
    _: str = Depends(get_current_user_id),
):
    rows = await NotificationRepository(conn).get_all()
    return [dict(r) for r in rows]


@router.post("/notification-channels", response_model=NotificationChannelResponse, status_code=status.HTTP_201_CREATED)
async def create_channel(
    data: NotificationChannelCreate,
    conn: asyncpg.Connection = Depends(get_conn),
    _: str = Depends(get_current_user_id),
):
    row = await NotificationRepository(conn).create(
        data.name, data.type.value, data.target, data.is_enabled
    )
    return dict(row)


@router.put("/notification-channels/{channel_id}", response_model=NotificationChannelResponse)
async def update_channel(
    channel_id: UUID,
    data: NotificationChannelUpdate,
    conn: asyncpg.Connection = Depends(get_conn),
    _: str = Depends(get_current_user_id),
):
    row = await NotificationRepository(conn).update(
        channel_id, data.name, data.target, data.is_enabled
    )
    if not row:
        raise HTTPException(status_code=404, detail="Canal introuvable")
    return dict(row)


@router.delete("/notification-channels/{channel_id}", response_model=MessageResponse)
async def delete_channel(
    channel_id: UUID,
    conn: asyncpg.Connection = Depends(get_conn),
    _: str = Depends(get_current_user_id),
):
    deleted = await NotificationRepository(conn).delete(channel_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Canal introuvable")
    return MessageResponse(message="Canal supprime")