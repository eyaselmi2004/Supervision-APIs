"""
schemas.py — Schémas Pydantic
Validation des entrées (Create/Update) et sorties (Response)
"""
from __future__ import annotations
from datetime import datetime
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field

from app.models.enums import (
    AlertStatus, ChannelType, HttpMethod,
    IncidentStatus, RuleType, Severity, UserRole,
)



# AUTH


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class TokenRefreshRequest(BaseModel):
    refresh_token: str


# USER

class UserCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    email: EmailStr
    password: str = Field(..., min_length=6)
    role: UserRole = UserRole.DEVOPS



class UserResponse(BaseModel):
    id: UUID
    name: str
    email: str
    role: UserRole
    is_active: bool
    created_at: datetime



# PROJECT

class ProjectCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = Field(None, max_length=500)
    icon_key: Optional[str] = Field(None, max_length=50)
    color: Optional[str] = Field(None, max_length=7)
    team_id: Optional[UUID] = None 


class ProjectUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = Field(None, max_length=500)
    icon_key: Optional[str] = Field(None, max_length=50)
    color: Optional[str] = Field(None, max_length=7)


class ProjectResponse(BaseModel):
    id: UUID
    name: str
    description: Optional[str] = None
    icon_key: Optional[str] = None
    color: Optional[str] = None
    owner_id: UUID
    team_id: Optional[UUID] = None
    is_active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ProjectStatsResponse(BaseModel):
    errors: int
    transactions: int
    crash_free_sessions: str


# API SERVICE

class ApiServiceCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    base_url: str = Field(..., max_length=500)
    is_active: bool = True
    project_id: Optional[UUID] = None


class ApiServiceUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=100)
    base_url: Optional[str] = Field(None, max_length=500)
    is_active: Optional[bool] = None
    project_id: Optional[UUID] = None


class ApiServiceResponse(BaseModel):
    id: UUID
    name: str
    base_url: str
    is_active: bool
    created_at: datetime
    project_id: Optional[UUID] = None  # ← AJOUTE CETTE LIGNE
    
    class Config:
        from_attributes = True


class ApiServiceDetailResponse(ApiServiceResponse):
    endpoints: List[EndpointResponse] = []


# ENDPOINT

class EndpointCreate(BaseModel):
    path: str = Field(..., max_length=500)
    method: HttpMethod
    is_active: bool = True


class EndpointUpdate(BaseModel):
    path: Optional[str] = Field(None, max_length=500)
    method: Optional[HttpMethod] = None
    is_active: Optional[bool] = None


class EndpointResponse(BaseModel):
    id: UUID
    api_service_id: UUID
    path: str
    method: HttpMethod
    is_active: bool



# METRICS

class ApiMetricCreate(BaseModel):
    endpoint_id: UUID
    timestamp: datetime
    response_time_ms: float = Field(..., ge=0)
    status_code: int = Field(..., ge=100, le=599)
    success: bool


class ApiMetricResponse(BaseModel):
    id: UUID
    endpoint_id: UUID
    timestamp: datetime
    response_time_ms: float
    status_code: int
    success: bool


class MetricsBatchCreate(BaseModel):
    metrics: List[ApiMetricCreate] = Field(..., min_length=1)


class AgentMetricPayload(BaseModel):
    """Payload envoyé par le middleware proxy SupervisionMiddleware"""
    api_service_id: UUID
    endpoint_path: str
    method: HttpMethod
    timestamp: datetime
    response_time_ms: float
    status_code: int


class MetricsStats(BaseModel):
    """Statistiques calculées sur une période"""
    endpoint_id: UUID
    period_start: datetime
    period_end: datetime
    total_requests: int
    success_count: int
    error_count: int
    avg_response_time_ms: float
    min_response_time_ms: float
    max_response_time_ms: float
    error_rate_percent: float


class MetricsTimeSeries(BaseModel):
    """Point de série temporelle — retourné par time_bucket() TimescaleDB"""
    bucket: str          # ISO datetime string
    total_requests: int
    avg_response_time_ms: float
    error_count: int


# SLA

class SlaReportCreate(BaseModel):
    endpoint_id: UUID
    period_start: datetime
    period_end: datetime


class SlaReportResponse(BaseModel):
    id: UUID
    endpoint_id: UUID
    period_start: datetime
    period_end: datetime
    availability_percent: float
    error_rate_percent: float
    avg_latency_ms: float
    created_at: datetime


# ALERT RULES

class AlertRuleCreate(BaseModel):
    name: str = Field(..., max_length=200)
    type: RuleType
    threshold: float = Field(..., gt=0)
    window_seconds: int = Field(60, ge=10)
    endpoint_id: UUID
    is_enabled: bool = True


class AlertRuleUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=200)
    threshold: Optional[float] = Field(None, gt=0)
    window_seconds: Optional[int] = Field(None, ge=10)
    is_enabled: Optional[bool] = None


class AlertRuleResponse(BaseModel):
    id: UUID
    endpoint_id: UUID
    owner_id: Optional[UUID] = None
    name: str
    type: RuleType
    threshold: float
    window_seconds: int
    is_enabled: bool


# ALERTS


class AlertResponse(BaseModel):
    id: UUID
    rule_id: UUID
    managed_by_id: Optional[UUID] = None
    message: str
    severity: Severity
    status: AlertStatus
    created_at: datetime
    acknowledged_at: Optional[datetime] = None
    resolved_at: Optional[datetime] = None
    assigned_to_id: Optional[UUID] = None
    project_id: Optional[UUID] = None


class AlertAcknowledgeRequest(BaseModel):
    user_id: UUID


# INCIDENTS

class IncidentCreate(BaseModel):
    title: str = Field(..., max_length=300)
    api_service_id: UUID
    source_alert_id: Optional[UUID] = None


class IncidentResolveRequest(BaseModel):
    resolution: str = Field(..., min_length=1)


class IncidentResponse(BaseModel):
    id: UUID
    api_service_id: UUID
    source_alert_id: Optional[UUID] = None
    title: str
    start_time: datetime
    end_time: Optional[datetime] = None
    status: IncidentStatus
    resolution: Optional[str] = None
    duration_minutes: Optional[float] = None


# NOTIFICATION CHANNELS

class NotificationChannelCreate(BaseModel):
    name: str = Field(..., max_length=100)
    type: ChannelType
    target: str = Field(..., max_length=500)
    is_enabled: bool = True


class NotificationChannelUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=100)
    target: Optional[str] = Field(None, max_length=500)
    is_enabled: Optional[bool] = None


class NotificationChannelResponse(BaseModel):
    id: UUID
    name: str
    type: ChannelType
    target: str
    is_enabled: bool
    

# GÉNÉRIQUE

class MessageResponse(BaseModel):
    message: str


class HealthResponse(BaseModel):
    status: str
    version: str
    environment: str


# Résolution des forward references
ApiServiceDetailResponse.model_rebuild()

# ── TEAMS ──

class TeamCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = Field(None, max_length=500)


class TeamMemberResponse(BaseModel):
    user_id: UUID
    name: str
    email: str
    role: str  # 'owner' | 'admin' | 'member'
    joined_at: datetime


class TeamResponse(BaseModel):
    id: UUID
    name: str
    description: Optional[str] = None
    invite_code: str
    owner_id: UUID
    is_active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class TeamInvitationResponse(BaseModel):
    id: UUID
    team_id: UUID
    name: str  # team name
    description: Optional[str] = None  # team description
    role: str  # 'admin' | 'member'
    created_at: datetime