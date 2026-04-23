from fastapi import APIRouter, Depends, HTTPException
import asyncpg

from app.core.database import get_conn
from app.core.security import get_current_user_id
from app.schemas.schemas import ExplainIssueRequest, ExplainIssueResponse
from app.services.llm_service import LLMService

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