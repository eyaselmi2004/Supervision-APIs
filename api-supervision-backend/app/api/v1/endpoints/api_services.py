from typing import List, Optional
from uuid import UUID
import time

import asyncpg
import httpx
from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.core.database import get_conn
from app.core.security import get_current_user_id
from app.repositories.api_service_repository import ApiServiceRepository
from app.schemas.schemas import (
    ApiServiceCreate,
    ApiServiceUpdate,
    ApiServiceResponse,
    ApiServiceDetailResponse,
    EndpointCreate,
    EndpointResponse,
    MessageResponse,
    MonitoredApiLoginRequest,
    MonitoredApiLoginResponse,
)

router = APIRouter(prefix="/api-services", tags=["API Services"])


class EndpointTestRequest(BaseModel):
    headers: dict[str, str] | None = None
    query_params: dict[str, str] | None = None
    json_body: dict | list | None = None


def normalize_endpoint_path(path: str) -> str:
    path = path.strip()

    if not path.startswith("/"):
        path = f"/{path}"

    if path != "/" and path.endswith("/"):
        path = path.rstrip("/")

    return path


async def is_global_admin(conn: asyncpg.Connection, user_id: str) -> bool:
    role = await conn.fetchval(
        """
        SELECT role
        FROM users
        WHERE id = $1
        """,
        UUID(user_id),
    )
    return str(role).upper() == "ADMIN"


async def can_access_project(
    conn: asyncpg.Connection,
    project_id: UUID,
    user_id: str,
) -> bool:
    if await is_global_admin(conn, user_id):
        return True

    allowed = await conn.fetchval(
        """
        SELECT 1
        FROM projects p
        LEFT JOIN team_members tm ON tm.team_id = p.team_id
        WHERE p.id = $1
          AND (
            p.owner_id = $2
            OR tm.user_id = $2
          )
        """,
        project_id,
        UUID(user_id),
    )

    return bool(allowed)


async def can_access_service(
    conn: asyncpg.Connection,
    service_id: UUID,
    user_id: str,
) -> bool:
    if await is_global_admin(conn, user_id):
        return True

    allowed = await conn.fetchval(
        """
        SELECT 1
        FROM api_services aps
        JOIN projects p ON aps.project_id = p.id
        LEFT JOIN team_members tm ON tm.team_id = p.team_id
        WHERE aps.id = $1
          AND (
            p.owner_id = $2
            OR tm.user_id = $2
          )
        """,
        service_id,
        UUID(user_id),
    )

    return bool(allowed)


@router.get("", response_model=List[ApiServiceResponse])
async def list_services(
    project_id: Optional[UUID] = Query(None),
    conn: asyncpg.Connection = Depends(get_conn),
    user_id: str = Depends(get_current_user_id),
):
    if await is_global_admin(conn, user_id):
        rows = await ApiServiceRepository(conn).get_all(project_id=project_id)
        return [dict(r) for r in rows]

    if project_id:
        allowed = await can_access_project(conn, project_id, user_id)
        if not allowed:
            return []

    query = """
        SELECT DISTINCT aps.*
        FROM api_services aps
        JOIN projects p ON aps.project_id = p.id
        LEFT JOIN team_members tm ON tm.team_id = p.team_id
        WHERE (
            p.owner_id = $1
            OR tm.user_id = $1
        )
    """

    params = [UUID(user_id)]

    if project_id:
        query += " AND aps.project_id = $2"
        params.append(project_id)

    query += " ORDER BY aps.created_at DESC"

    rows = await conn.fetch(query, *params)
    return [dict(r) for r in rows]


@router.post("", response_model=ApiServiceResponse, status_code=status.HTTP_201_CREATED)
async def create_service(
    data: ApiServiceCreate,
    conn: asyncpg.Connection = Depends(get_conn),
    user_id: str = Depends(get_current_user_id),
):
    if data.project_id:
        allowed = await can_access_project(conn, data.project_id, user_id)
        if not allowed:
            raise HTTPException(
                status_code=403,
                detail="Vous n'avez pas accès à ce projet",
            )

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
    user_id: str = Depends(get_current_user_id),
):
    allowed = await can_access_service(conn, service_id, user_id)
    if not allowed:
        raise HTTPException(status_code=403, detail="Accès refusé à cette API")

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
    user_id: str = Depends(get_current_user_id),
):
    allowed = await can_access_service(conn, service_id, user_id)
    if not allowed:
        raise HTTPException(status_code=403, detail="Accès refusé à cette API")

    if data.project_id:
        project_allowed = await can_access_project(conn, data.project_id, user_id)
        if not project_allowed:
            raise HTTPException(
                status_code=403,
                detail="Vous n'avez pas accès au projet cible",
            )

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
    user_id: str = Depends(get_current_user_id),
):
    allowed = await can_access_service(conn, service_id, user_id)
    if not allowed:
        raise HTTPException(status_code=403, detail="Accès refusé à cette API")

    deleted = await ApiServiceRepository(conn).delete(service_id)

    if not deleted:
        raise HTTPException(status_code=404, detail="Service introuvable")

    return MessageResponse(message="Service supprimé")


@router.get("/{service_id}/endpoints", response_model=List[EndpointResponse])
async def list_endpoints(
    service_id: UUID,
    conn: asyncpg.Connection = Depends(get_conn),
    user_id: str = Depends(get_current_user_id),
):
    allowed = await can_access_service(conn, service_id, user_id)
    if not allowed:
        raise HTTPException(status_code=403, detail="Accès refusé à cette API")

    rows = await ApiServiceRepository(conn).get_endpoints(service_id)
    return [dict(r) for r in rows]


@router.post("/{service_id}/endpoints", response_model=EndpointResponse, status_code=status.HTTP_201_CREATED)
async def create_endpoint(
    service_id: UUID,
    data: EndpointCreate,
    conn: asyncpg.Connection = Depends(get_conn),
    user_id: str = Depends(get_current_user_id),
):
    allowed = await can_access_service(conn, service_id, user_id)
    if not allowed:
        raise HTTPException(status_code=403, detail="Accès refusé à cette API")

    repo = ApiServiceRepository(conn)
    service = await repo.get_by_id(service_id)

    if not service:
        raise HTTPException(status_code=404, detail="Service introuvable")

    normalized_path = normalize_endpoint_path(data.path)

    existing = await repo.find_endpoint(
        service_id,
        normalized_path,
        data.method.value,
    )

    if existing:
        return dict(existing)

    row = await repo.create_endpoint(
        service_id,
        normalized_path,
        data.method.value,
        data.is_active,
    )

    return dict(row)


@router.post("/{service_id}/discover-endpoints")
async def discover_endpoints(
    service_id: UUID,
    conn: asyncpg.Connection = Depends(get_conn),
    user_id: str = Depends(get_current_user_id),
):
    allowed = await can_access_service(conn, service_id, user_id)
    if not allowed:
        raise HTTPException(status_code=403, detail="Accès refusé à cette API")

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
            detail=(
                f"Impossible de charger le fichier OpenAPI pour {base_url}. "
                f"Dernière erreur: {last_error}"
            ),
        )

    paths = openapi_data.get("paths", {})
    allowed_methods = {"get", "post", "put", "delete", "patch", "options", "head"}

    discovered = 0
    created = 0
    skipped_existing = 0
    normalized_duplicates = 0

    seen: set[tuple[str, str]] = set()

    for raw_path, operations in paths.items():
        if not isinstance(operations, dict):
            continue

        path = normalize_endpoint_path(raw_path)

        for method_name in operations.keys():
            if method_name.lower() not in allowed_methods:
                continue

            discovered += 1
            method = method_name.upper()

            key = (method, path)

            if key in seen:
                normalized_duplicates += 1
                continue

            seen.add(key)

            existing = await repo.find_endpoint(service_id, path, method)

            if existing:
                skipped_existing += 1
                continue

            await repo.create_endpoint(service_id, path, method, True)
            created += 1

    return {
        "message": "Endpoints discovered successfully",
        "service_id": str(service_id),
        "base_url": base_url,
        "discovered": discovered,
        "created": created,
        "skipped_existing": skipped_existing,
        "normalized_duplicates": normalized_duplicates,
    }


@router.post("/{service_id}/endpoints/{endpoint_id}/test")
async def test_endpoint(
    service_id: UUID,
    endpoint_id: UUID,
    payload: EndpointTestRequest | None = None,
    conn: asyncpg.Connection = Depends(get_conn),
    user_id: str = Depends(get_current_user_id),
):
    allowed = await can_access_service(conn, service_id, user_id)
    if not allowed:
        raise HTTPException(status_code=403, detail="Accès refusé à cette API")

    repo = ApiServiceRepository(conn)

    service = await repo.get_by_id(service_id)

    if not service:
        raise HTTPException(status_code=404, detail="Service introuvable")

    endpoint = await repo.get_endpoint_by_id(endpoint_id)

    if not endpoint or endpoint["api_service_id"] != service_id:
        raise HTTPException(status_code=404, detail="Endpoint introuvable")

    base_url = str(service["base_url"]).rstrip("/")
    path = normalize_endpoint_path(str(endpoint["path"]))
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
            INSERT INTO api_metrics (
                endpoint_id,
                timestamp,
                response_time_ms,
                status_code,
                success
            )
            VALUES ($1, NOW(), $2, $3, $4)
            """,
            endpoint_id,
            elapsed_ms,
            response.status_code,
            response.status_code < 400,
        )

        return {
            "service_id": str(service_id),
            "endpoint_id": str(endpoint_id),
            "method": method,
            "url": url,
            "status_code": response.status_code,
            "success": response.status_code < 400,
            "response_time_ms": elapsed_ms,
            "response_preview": response.text[:1000] if response.text else "",
        }

    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Test failed: {exc}") from exc


@router.post("/{service_id}/auth/login", response_model=MonitoredApiLoginResponse)
async def login_to_monitored_api(
    service_id: UUID,
    data: MonitoredApiLoginRequest,
    conn: asyncpg.Connection = Depends(get_conn),
    user_id: str = Depends(get_current_user_id),
):
    allowed = await can_access_service(conn, service_id, user_id)
    if not allowed:
        raise HTTPException(status_code=403, detail="Accès refusé à cette API")

    repo = ApiServiceRepository(conn)
    service = await repo.get_by_id(service_id)

    if not service:
        raise HTTPException(status_code=404, detail="Service introuvable")

    base_url = str(service["base_url"]).rstrip("/")
    login_path = normalize_endpoint_path(data.login_path or "/api/v1/login/access-token")

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
        raise HTTPException(
            status_code=500,
            detail=f"Impossible de se connecter à l'API monitorée: {exc}",
        ) from exc