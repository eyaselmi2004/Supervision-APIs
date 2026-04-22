"""
app/api/v1/endpoints/health_checks.py
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Endpoints pour gérer les health checks des APIs
"""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from uuid import UUID
import asyncpg
from app.core.database import get_conn
from typing import Optional
from datetime import datetime

router = APIRouter(prefix="/health-checks", tags=["Health Checks"])

# ── Schémas ──
class HealthCheckCreate(BaseModel):
    api_service_id: str
    status: str  # 'healthy', 'unhealthy', 'unavailable'
    response_time: Optional[float] = None
    error_rate: Optional[float] = None
    requests_per_second: Optional[float] = None
    cpu_usage: Optional[float] = None
    memory_usage: Optional[float] = None

from pydantic import BaseModel, ConfigDict
from uuid import UUID
from typing import Optional
from datetime import datetime

class HealthCheckResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    id: UUID
    api_service_id: UUID
    status: str
    response_time: Optional[float] = None
    error_rate: Optional[float] = None
    requests_per_second: Optional[float] = None
    cpu_usage: Optional[float] = None
    memory_usage: Optional[float] = None
    created_at: datetime

# ── Créer un health check ──
@router.post("/")
async def create_health_check(
    data: HealthCheckCreate,
    conn: asyncpg.Connection = Depends(get_conn),
):
    """Crée un health check pour une API"""
    
    print(f"\n📊 [Health Check] Reçu pour API {data.api_service_id}")
    print(f"   Status: {data.status}")
    print(f"   Response time: {data.response_time}ms")
    print(f"   Error rate: {data.error_rate}%")
    print(f"   CPU: {data.cpu_usage}%")
    print(f"   Memory: {data.memory_usage}%")
    
    try:
        api_uuid = UUID(data.api_service_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid UUID")
    
    # ✅ Vérifier que l'API existe
    api_service = await conn.fetchval(
        "SELECT id FROM api_services WHERE id = $1",
        api_uuid
    )
    
    if not api_service:
        print(f"❌ API {data.api_service_id} introuvable")
        raise HTTPException(status_code=404, detail="API Service not found")
    
    # ✨ Insérer le health check
    health_check_id = await conn.fetchval(
        """
        INSERT INTO health_checks 
        (api_service_id, status, response_time, error_rate, requests_per_second, cpu_usage, memory_usage, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
        RETURNING id
        """,
        api_uuid,
        data.status,
        data.response_time,
        data.error_rate,
        data.requests_per_second,
        data.cpu_usage,
        data.memory_usage
    )
    
    print(f"✅ Health check créé : {health_check_id}")
    
    # 🚨 Créer une alerte si unhealthy
    if data.status != "healthy":
        severity = "CRITICAL" if data.status == "unavailable" else "WARNING"
        message = f"API Service unhealthy: {data.status}"
        
        if data.error_rate and data.error_rate > 10:
            message += f" - Error rate {data.error_rate}%"
        if data.response_time and data.response_time > 5000:
            message += f" - Response time {data.response_time}ms"
        if data.memory_usage and data.memory_usage > 85:
            message += f" - Memory {data.memory_usage}%"
        
        alert_id = await conn.fetchval(
            """
            INSERT INTO alerts 
            (api_service_id, message, severity, status, created_at)
            VALUES ($1, $2, $3, 'OPEN', NOW())
            RETURNING id
            """,
            api_uuid,
            message,
            severity
        )
        
        print(f"⚠️  Alerte créée : {alert_id} ({severity})")
    
    # Retourner en dict
    return {
        "status": "success",
        "id": str(health_check_id),
        "message": "Health check enregistré"
    }
    """
    Crée un health check pour une API
    
    Cela génère automatiquement des alertes si nécessaire
    """
    
    print(f"\n📊 [Health Check] Reçu pour API {data.api_service_id}")
    print(f"   Status: {data.status}")
    print(f"   Response time: {data.response_time}ms")
    print(f"   Error rate: {data.error_rate}%")
    print(f"   CPU: {data.cpu_usage}%")
    print(f"   Memory: {data.memory_usage}%")
    
    try:
        api_uuid = UUID(data.api_service_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid UUID")
    
    # ✅ Vérifier que l'API existe
    api_service = await conn.fetchval(
        "SELECT id FROM api_services WHERE id = $1",
        api_uuid
    )
    
    if not api_service:
        print(f"❌ API {data.api_service_id} introuvable")
        raise HTTPException(status_code=404, detail="API Service not found")
    
    # ✨ Insérer le health check
    health_check_id = await conn.fetchval(
        """
        INSERT INTO health_checks 
        (api_service_id, status, response_time, error_rate, requests_per_second, cpu_usage, memory_usage, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
        RETURNING id
        """,
        api_uuid,
        data.status,
        data.response_time,
        data.error_rate,
        data.requests_per_second,
        data.cpu_usage,
        data.memory_usage
    )
    
    print(f"✅ Health check créé : {health_check_id}")
    
    # 🚨 Créer une alerte si unhealthy
    if data.status != "healthy":
        severity = "CRITICAL" if data.status == "unavailable" else "WARNING"
        message = f"API Service unhealthy: {data.status}"
        
        if data.error_rate and data.error_rate > 10:
            message += f" - Error rate {data.error_rate}%"
        if data.response_time and data.response_time > 5000:
            message += f" - Response time {data.response_time}ms"
        if data.memory_usage and data.memory_usage > 85:
            message += f" - Memory {data.memory_usage}%"
        
        alert_id = await conn.fetchval(
            """
            INSERT INTO alerts 
            (api_service_id, message, severity, status, created_at)
            VALUES ($1, $2, $3, 'OPEN', NOW())
            RETURNING id
            """,
            api_uuid,
            message,
            severity
        )
        
        print(f"⚠️  Alerte créée : {alert_id} ({severity})")
    
    # Récupérer et retourner le health check
    result = await conn.fetchrow(
        "SELECT * FROM health_checks WHERE id = $1",
        health_check_id
    )
    
    return result


# ── Récupérer les derniers health checks ──
@router.get("/{api_id}", response_model=list[HealthCheckResponse])
async def get_health_checks(
    api_id: str,
    limit: int = 10,
    conn: asyncpg.Connection = Depends(get_conn),
):
    """Récupère les derniers health checks d'une API"""
    
    try:
        api_uuid = UUID(api_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid UUID")
    
    results = await conn.fetch(
        """
        SELECT * FROM health_checks 
        WHERE api_service_id = $1
        ORDER BY created_at DESC
        LIMIT $2
        """,
        api_uuid,
        limit
    )
    
    return results