from typing import List, Optional
from uuid import UUID
import time
import httpx
from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException, Query, status
import asyncpg
import httpx
from app.schemas.schemas import MonitoredApiLoginRequest, MonitoredApiLoginResponse
from app.core.database import get_conn
from app.core.security import get_current_user_id
from app.repositories.api_service_repository import ApiServiceRepository
from app.schemas.schemas import (
    ApiServiceCreate, ApiServiceUpdate, ApiServiceResponse,
    ApiServiceDetailResponse, EndpointCreate, EndpointResponse,
    MessageResponse,
)

router = APIRouter(prefix="/api-services", tags=["API Services"])


class EndpointTestRequest(BaseModel):
    headers: dict[str, str] | None = None
    query_params: dict[str, str] | None = None
    json_body: dict | list | None = None

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

@router.post("/{service_id}/discover-endpoints")
async def discover_endpoints(
    service_id: UUID,
    conn: asyncpg.Connection = Depends(get_conn),
    _: str = Depends(get_current_user_id),
):
    repo = ApiServiceRepository(conn)
    service = await repo.get_by_id(service_id)
    if not service:
        raise HTTPException(status_code=404, detail="Service introuvable")

    base_url = str(service["base_url"]).rstrip("/")

    openapi_candidates = [
        f"{base_url}/openapi.json",
        f"{base_url}/api/v1/openapi.json",
        f"{base_url}/docs/openapi.json",
    ]

    openapi_data = None
    last_error = None

    async with httpx.AsyncClient(timeout=15.0, follow_redirects=True) as client:
        for url in openapi_candidates:
            try:
                response = await client.get(url)
                if response.status_code == 200:
                    data = response.json()
                    if isinstance(data, dict) and "paths" in data:
                        openapi_data = data
                        break
            except Exception as exc:
                last_error = str(exc)

    if not openapi_data:
        raise HTTPException(
            status_code=400,
            detail=f"Impossible de charger le fichier OpenAPI pour {base_url}. Dernière erreur: {last_error}",
        )

    paths = openapi_data.get("paths", {})
    allowed_methods = {"get", "post", "put", "delete", "patch", "options", "head"}

    discovered = 0
    created = 0

    for path, operations in paths.items():
        if not isinstance(operations, dict):
            continue

        for method_name, operation in operations.items():
            if method_name.lower() not in allowed_methods:
                continue

            discovered += 1
            method = method_name.upper()

            existing = await repo.find_endpoint(service_id, path, method)
            if existing:
                continue

            await repo.create_endpoint(service_id, path, method, True)
            created += 1

    return {
        "message": "Endpoints discovered successfully",
        "service_id": str(service_id),
        "base_url": base_url,
        "discovered": discovered,
        "created": created,
    }


@router.post("/{service_id}/endpoints/{endpoint_id}/test")
async def test_endpoint(
    service_id: UUID,
    endpoint_id: UUID,
    payload: EndpointTestRequest | None = None,
    conn: asyncpg.Connection = Depends(get_conn),
    _: str = Depends(get_current_user_id),
):
    repo = ApiServiceRepository(conn)

    service = await repo.get_by_id(service_id)
    if not service:
        raise HTTPException(status_code=404, detail="Service introuvable")

    endpoint = await repo.get_endpoint_by_id(endpoint_id)
    if not endpoint or endpoint["api_service_id"] != service_id:
        raise HTTPException(status_code=404, detail="Endpoint introuvable")

    base_url = str(service["base_url"]).rstrip("/")
    path = str(endpoint["path"])
    method = str(endpoint["method"]).upper()

    url = f"{base_url}{path}"

    headers = payload.headers if payload and payload.headers else {}
    query_params = payload.query_params if payload and payload.query_params else {}
    json_body = payload.json_body if payload else None

    try:
        async with httpx.AsyncClient(timeout=20.0, follow_redirects=True) as client:
            start = time.perf_counter()

            response = await client.request(
                method=method,
                url=url,
                headers=headers,
                params=query_params,
                json=json_body if method in {"POST", "PUT", "PATCH"} else None,
            )

            elapsed_ms = round((time.perf_counter() - start) * 1000, 2)

        await conn.execute(
            """
            INSERT INTO api_metrics (endpoint_id, timestamp, response_time_ms, status_code, success)
            VALUES ($1, NOW(), $2, $3, $4)
            """,
            endpoint_id,
            elapsed_ms,
            response.status_code,
            response.status_code < 400,
        )

        response_preview = response.text[:1000] if response.text else ""

        return {
            "service_id": str(service_id),
            "endpoint_id": str(endpoint_id),
            "method": method,
            "url": url,
            "status_code": response.status_code,
            "success": response.status_code < 400,
            "response_time_ms": elapsed_ms,
            "response_preview": response_preview,
        }

    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Test failed: {exc}") from exc



@router.post("/{service_id}/auth/login", response_model=MonitoredApiLoginResponse)
async def login_to_monitored_api(
    service_id: UUID,
    data: MonitoredApiLoginRequest,
    conn: asyncpg.Connection = Depends(get_conn),
    _: str = Depends(get_current_user_id),
):
    repo = ApiServiceRepository(conn)
    service = await repo.get_by_id(service_id)
    if not service:
        raise HTTPException(status_code=404, detail="Service introuvable")

    base_url = str(service["base_url"]).rstrip("/")
    login_path = (data.login_path or "/api/v1/login/access-token").strip()

    if not login_path.startswith("/"):
        login_path = f"/{login_path}"

    login_url = f"{base_url}{login_path}"

    form_data = {
        "username": data.username,
        "password": data.password,
    }

    try:
        async with httpx.AsyncClient(timeout=20.0, follow_redirects=True) as client:
            response = await client.post(
                login_url,
                data=form_data,
                headers={"Content-Type": "application/x-www-form-urlencoded"},
            )

        if response.status_code >= 400:
            raise HTTPException(
                status_code=response.status_code,
                detail=f"Échec de connexion à l'API monitorée: {response.text}",
            )

        payload = response.json()
        access_token = payload.get("access_token")
        token_type = payload.get("token_type", "bearer")

        if not access_token:
            raise HTTPException(
                status_code=400,
                detail="L'API monitorée n'a pas retourné de access_token",
            )

        return MonitoredApiLoginResponse(
            access_token=access_token,
            token_type=token_type,
        )

    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Impossible de se connecter à l'API monitorée: {exc}") from exc