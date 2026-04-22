"""
SupervisionMiddleware - automatic API supervision agent.
"""

import time
from datetime import datetime, timezone
from typing import Set

import httpx
from fastapi import Request
from loguru import logger
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response


class SupervisionMiddleware(BaseHTTPMiddleware):
    """
    Middleware that measures each request and sends metrics to Traceon.

    Installation example:
        app.add_middleware(
            SupervisionMiddleware,
            agent_url="http://localhost:8000",
            api_service_id="uuid",
            access_token="jwt-token"
        )
    """

    EXCLUDED_PATHS: Set[str] = {
        "/docs",
        "/openapi.json",
        "/redoc",
        "/health",
        "/favicon.ico",
        "/api/v1/metrics/agent",
    }

    def __init__(self, app, agent_url: str, api_service_id: str, access_token: str = ""):
        super().__init__(app)
        self.agent_url = agent_url.rstrip("/")
        self.api_service_id = api_service_id
        self.access_token = access_token

    @staticmethod
    def _normalize_path(path: str) -> str:
        normalized = (path or "/").split("?", 1)[0].strip()
        if not normalized.startswith("/"):
            normalized = f"/{normalized}"
        if normalized != "/":
            normalized = normalized.rstrip("/")
        return normalized or "/"

    def _should_skip_metric(self, path: str) -> bool:
        normalized = self._normalize_path(path)
        return normalized in self.EXCLUDED_PATHS

    async def dispatch(self, request: Request, call_next) -> Response:
        start = time.monotonic()
        response = await call_next(request)

        path = request.url.path
        if self._should_skip_metric(path):
            return response

        response_time_ms = (time.monotonic() - start) * 1000

        await self._send_metric(
            path=path,
            method=request.method,
            status_code=response.status_code,
            response_time_ms=response_time_ms,
        )

        return response

    async def _send_metric(
        self,
        path: str,
        method: str,
        status_code: int,
        response_time_ms: float,
    ) -> None:
        payload = {
            "api_service_id": self.api_service_id,
            "endpoint_path": path,
            "method": method,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "response_time_ms": round(response_time_ms, 2),
            "status_code": status_code,
        }

        headers = {"Authorization": f"Bearer {self.access_token}"} if self.access_token else {}

        try:
            async with httpx.AsyncClient(timeout=2.0) as client:
                await client.post(
                    f"{self.agent_url}/api/v1/metrics/agent",
                    json=payload,
                    headers=headers,
                )
        except Exception as exc:
            # Must stay transparent and never block the supervised app.
            logger.debug("SupervisionMiddleware: metric send failed - {}", exc)
