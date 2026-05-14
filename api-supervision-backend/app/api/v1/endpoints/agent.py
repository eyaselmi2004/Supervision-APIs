from uuid import UUID
from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException
import asyncpg

from app.core.database import get_conn

router = APIRouter(prefix="/agent", tags=["Agent"])


class AgentRegisterRequest(BaseModel):
    project_id: UUID
    api_name: str
    base_url: str


class AgentRegisterResponse(BaseModel):
    api_service_id: UUID
    message: str


@router.post("/register", response_model=AgentRegisterResponse)
async def register_agent_api(
    data: AgentRegisterRequest,
    conn: asyncpg.Connection = Depends(get_conn),
):
    project = await conn.fetchrow(
        """
        SELECT id
        FROM projects
        WHERE id = $1 AND is_active = TRUE
        """,
        data.project_id,
    )

    if not project:
        raise HTTPException(status_code=404, detail="Projet introuvable")

    existing_api = await conn.fetchrow(
        """
        SELECT id
        FROM api_services
        WHERE project_id = $1
          AND base_url = $2
        """,
        data.project_id,
        data.base_url,
    )

    if existing_api:
        return {
            "api_service_id": existing_api["id"],
            "message": "API déjà enregistrée",
        }

    api = await conn.fetchrow(
        """
        INSERT INTO api_services (name, base_url, is_active, project_id)
        VALUES ($1, $2, TRUE, $3)
        RETURNING id
        """,
        data.api_name,
        data.base_url,
        data.project_id,
    )

    return {
        "api_service_id": api["id"],
        "message": "API enregistrée automatiquement",
    }