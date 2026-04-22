from fastapi import APIRouter, Depends
from pydantic import BaseModel
from typing import Optional
from uuid import UUID
import asyncpg

from app.core.database import get_conn
from app.core.security import get_current_user_id

router = APIRouter(prefix="/notifications", tags=["notifications"])

class ChannelCreate(BaseModel):
    name: str
    type: str        # EMAIL ou WEBHOOK
    target: str      # email ou URL
    is_enabled: bool = True

class ChannelUpdate(BaseModel):
    is_enabled: bool

@router.get("/channels")
async def get_channels(
    conn: asyncpg.Connection = Depends(get_conn),
    _: str = Depends(get_current_user_id)
):
    rows = await conn.fetch("""
        SELECT id, name, type::text, target, is_enabled, created_at
        FROM notification_channels
        ORDER BY created_at DESC
    """)
    # type::text : convertit l'enum en string pour la sérialisation JSON
    return [dict(r) for r in rows]
    
@router.post("/channels", status_code=201)
async def create_channel(
    data: ChannelCreate,
    conn: asyncpg.Connection = Depends(get_conn),
    _: str = Depends(get_current_user_id)
):
    row = await conn.fetchrow("""
        INSERT INTO notification_channels (name, type, target, is_enabled)
        VALUES ($1, $2::channeltype, $3, $4)
        RETURNING *
    """, data.name, data.type, data.target, data.is_enabled)
    return dict(row)

@router.put("/channels/{channel_id}")
async def update_channel(
    channel_id: UUID,
    data: ChannelUpdate,
    conn: asyncpg.Connection = Depends(get_conn),
    _: str = Depends(get_current_user_id)
):
    row = await conn.fetchrow("""
        UPDATE notification_channels
        SET is_enabled = $1
        WHERE id = $2
        RETURNING *
    """, data.is_enabled, channel_id)
    return dict(row)

@router.delete("/channels/{channel_id}")
async def delete_channel(
    channel_id: UUID,
    conn: asyncpg.Connection = Depends(get_conn),
    _: str = Depends(get_current_user_id)
):
    await conn.execute("""
        DELETE FROM notification_channels WHERE id = $1
    """, channel_id)
    return {"deleted": True}