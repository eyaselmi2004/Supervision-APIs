from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
import asyncpg

from app.core.database import get_conn
from app.core.security import get_current_user_id
from app.schemas.schemas import (
    ExplainIssueRequest,
    ExplainIssueResponse,
    ExplainEndpointIssueRequest,
    ExplainEndpointIssueResponse,
    ExplainAlertResponse,
)
from app.services.llm_service import LLMService
from app.services.llm_context_service import LLMContextService

router = APIRouter(prefix="/llm", tags=["LLM"])


@router.post("/explain-issue", response_model=ExplainIssueResponse)
async def explain_issue(
    data: ExplainIssueRequest,
    conn: asyncpg.Connection = Depends(get_conn),
    _: str = Depends(get_current_user_id),
):
    try:
        service = LLMService()
        analysis = await service.explain_issue(data.model_dump())
        return ExplainIssueResponse(analysis=analysis)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"LLM error: {exc}") from exc


@router.post(
    "/explain-endpoint/{endpoint_id}",
    response_model=ExplainEndpointIssueResponse,
)
async def explain_endpoint_issue(
    endpoint_id: UUID,
    data: ExplainEndpointIssueRequest | None = None,
    conn: asyncpg.Connection = Depends(get_conn),
    _: str = Depends(get_current_user_id),
):
    try:
        period_hours = data.period_hours if data else 24

        context = await LLMContextService(conn).build_endpoint_issue_context(
            endpoint_id=endpoint_id,
            period_hours=period_hours,
        )

        analysis = await LLMService().explain_endpoint_issue(context)

        return ExplainEndpointIssueResponse(
            endpoint_id=endpoint_id,
            analysis=analysis,
        )

    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"LLM endpoint explanation error: {exc}",
        ) from exc


@router.post("/debug-endpoint-context/{endpoint_id}")
async def debug_endpoint_context(
    endpoint_id: UUID,
    data: ExplainEndpointIssueRequest | None = None,
    conn: asyncpg.Connection = Depends(get_conn),
    _: str = Depends(get_current_user_id),
):
    period_hours = data.period_hours if data else 24

    context = await LLMContextService(conn).build_endpoint_issue_context(
        endpoint_id=endpoint_id,
        period_hours=period_hours,
    )

    return context


@router.post("/explain-alert/{alert_id}", response_model=ExplainAlertResponse)
async def explain_alert(
    alert_id: UUID,
    conn: asyncpg.Connection = Depends(get_conn),
    _: str = Depends(get_current_user_id),
):
    try:
        context = await LLMContextService(conn).build_alert_context(alert_id)
        analysis = await LLMService().explain_alert(context)

        return ExplainAlertResponse(
            alert_id=alert_id,
            analysis=analysis,
        )

    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"LLM alert explanation error: {exc}",
        ) from exc


@router.post("/explain-incident/{incident_id}")
async def explain_incident(
    incident_id: UUID,
    conn: asyncpg.Connection = Depends(get_conn),
    _: str = Depends(get_current_user_id),
):
    try:
        context = await LLMContextService(conn).build_incident_context(
            incident_id=incident_id,
            period_hours=24,
        )

        analysis = await LLMService().explain_incident_root_cause(context)

        return {
            "incident_id": str(incident_id),
            "analysis": analysis,
        }

    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"LLM incident explanation error: {exc}",
        ) from exc