from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
import asyncpg

from app.core.database import get_conn
from app.core.security import get_current_user_id
from app.repositories.api_service_repository import ApiServiceRepository
from app.schemas.schemas import (
    ApiServiceCreate, ApiServiceUpdate, ApiServiceResponse,
    ApiServiceDetailResponse, EndpointCreate, EndpointResponse,
    MessageResponse,
)

router = APIRouter(prefix="/api-services", tags=["API Services"])


@router.get("", response_model=List[ApiServiceResponse])
async def list_services(
    project_id: Optional[UUID] = Query(None),
    conn: asyncpg.Connection = Depends(get_conn),
    _: str = Depends(get_current_user_id),
):
    rows = await ApiServiceRepository(conn).get_all(project_id=project_id)
    return [dict(r) for r in rows]


@router.post("", response_model=ApiServiceResponse, status_code=status.HTTP_201_CREATED)
async def create_service(
    data: ApiServiceCreate,
    conn: asyncpg.Connection = Depends(get_conn),
    _: str = Depends(get_current_user_id),
):
    row = await ApiServiceRepository(conn).create(
        data.name,
        data.base_url,
        data.is_active,
        data.project_id,
    )
    return dict(row)


@router.get("/{service_id}", response_model=ApiServiceDetailResponse)
async def get_service(
    service_id: UUID,
    conn: asyncpg.Connection = Depends(get_conn),
    _: str = Depends(get_current_user_id),
):
    repo = ApiServiceRepository(conn)
    service = await repo.get_by_id(service_id)
    if not service:
        raise HTTPException(status_code=404, detail="Service introuvable")

    endpoints = await repo.get_endpoints(service_id)
    result = dict(service)
    result["endpoints"] = [dict(e) for e in endpoints]
    return result


@router.put("/{service_id}", response_model=ApiServiceResponse)
async def update_service(
    service_id: UUID,
    data: ApiServiceUpdate,
    conn: asyncpg.Connection = Depends(get_conn),
    _: str = Depends(get_current_user_id),
):
    row = await ApiServiceRepository(conn).update(
        service_id,
        data.name,
        data.base_url,
        data.is_active,
        data.project_id,
    )
    if not row:
        raise HTTPException(status_code=404, detail="Service introuvable")
    return dict(row)


@router.delete("/{service_id}", response_model=MessageResponse)
async def delete_service(
    service_id: UUID,
    conn: asyncpg.Connection = Depends(get_conn),
    _: str = Depends(get_current_user_id),
):
    deleted = await ApiServiceRepository(conn).delete(service_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Service introuvable")
    return MessageResponse(message="Service supprimé")


@router.get("/{service_id}/endpoints", response_model=List[EndpointResponse])
async def list_endpoints(
    service_id: UUID,
    conn: asyncpg.Connection = Depends(get_conn),
    _: str = Depends(get_current_user_id),
):
    rows = await ApiServiceRepository(conn).get_endpoints(service_id)
    return [dict(r) for r in rows]


@router.post("/{service_id}/endpoints", response_model=EndpointResponse, status_code=status.HTTP_201_CREATED)
async def create_endpoint(
    service_id: UUID,
    data: EndpointCreate,
    conn: asyncpg.Connection = Depends(get_conn),
    _: str = Depends(get_current_user_id),
):
    repo = ApiServiceRepository(conn)
    service = await repo.get_by_id(service_id)
    if not service:
        raise HTTPException(status_code=404, detail="Service introuvable")

    row = await repo.create_endpoint(service_id, data.path, data.method.value, data.is_active)
    return dict(row)