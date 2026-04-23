"""
app/api/v1/endpoints/webhooks.py
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Webhooks pour synchroniser les APIs depuis des plateformes externes
"""

from fastapi import APIRouter, Depends, HTTPException
from uuid import UUID
import asyncpg
from app.core.database import get_conn
from pydantic import BaseModel
from typing import List, Optional
import json

router = APIRouter(prefix="/webhooks", tags=["Webhooks"])

# ── Schémas Pydantic ──
class EndpointModel(BaseModel):
    path: str
    method: str  # GET, POST, PUT, DELETE, etc
    description: Optional[str] = None

class ApiWebhookPayload(BaseModel):
    """Payload reçu du webhook pour synchroniser les APIs"""
    name: str
    base_url: str
    description: Optional[str] = None
    endpoints: Optional[List[EndpointModel]] = None

class SyncApisRequest(BaseModel):
    """Request body pour sync les APIs d'un projet"""
    apis: List[ApiWebhookPayload]
    auth_token: Optional[str] = None  # Token de sécurité

# ── Endpoint Webhook ──
@router.post("/projects/{project_id}/sync-apis")
async def sync_project_apis(
    project_id: str,
    request: SyncApisRequest,
    conn: asyncpg.Connection = Depends(get_conn),
):
    """
    Webhook pour synchroniser les APIs d'une plateforme externe.
    
    Une plateforme envoie la liste de ses APIs, et on les ajoute/met à jour
    automatiquement dans la BD, en les assignant au projet.
    
    Args:
        project_id: UUID du projet
        request: Payload avec liste des APIs à synchroniser
        conn: Connexion PostgreSQL
        
    Returns:
        {
            "status": "success",
            "message": "X APIs synchronisées",
            "created": 3,
            "updated": 2,
            "api_ids": ["uuid1", "uuid2", ...]
        }
    """
    
    print(f"\n🔔 WEBHOOK REÇU : Synchronisation pour projet {project_id}")
    print(f"📚 APIs à synchroniser : {len(request.apis)}")
    
    try:
        project_uuid = UUID(project_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid project UUID")
    
    # ✅ Vérifier que le projet existe
    project = await conn.fetchval(
        "SELECT id FROM projects WHERE id = $1",
        project_uuid
    )
    
    if not project:
        print(f"❌ Projet {project_id} introuvable")
        raise HTTPException(status_code=404, detail="Project not found")
    
    created_count = 0
    updated_count = 0
    created_api_ids = []
    
    # 🔄 Boucler sur chaque API
    for api_data in request.apis:
        print(f"\n📝 Traitement API : {api_data.name}")
        
        # ✅ Vérifier si l'API existe déjà
        existing_api = await conn.fetchval(
            """
            SELECT id FROM api_services 
            WHERE name = $1 AND base_url = $2
            """,
            api_data.name,
            api_data.base_url
        )
        
        if existing_api:
            # 🔄 MISE À JOUR
            print(f"  ↩️ API existe, mise à jour...")
            await conn.execute(
                """
                UPDATE api_services
                SET project_id = $1, is_active = TRUE, updated_at = NOW()
                WHERE id = $2
                """,
                project_uuid,
                existing_api
            )
            updated_count += 1
            print(f"  ✅ Mise à jour réussie")
        else:
            # ✨ CRÉATION
            print(f"  ✨ Nouvelle API, création...")
            api_id = await conn.fetchval(
                """
                INSERT INTO api_services (name, base_url, description, project_id, is_active)
                VALUES ($1, $2, $3, $4, TRUE)
                RETURNING id
                """,
                api_data.name,
                api_data.base_url,
                api_data.description,
                project_uuid
            )
            created_count += 1
            created_api_ids.append(str(api_id))
            print(f"  ✅ Création réussie : {api_id}")
            
            # ➕ Créer les endpoints si fournis
            if api_data.endpoints:
                print(f"  📍 Ajout de {len(api_data.endpoints)} endpoints...")
                for endpoint in api_data.endpoints:
                    await conn.execute(
                        """
                        INSERT INTO endpoints (api_service_id, path, method, description, is_active)
                        VALUES ($1, $2, $3, $4, TRUE)
                        ON CONFLICT DO NOTHING
                        """,
                        api_id,
                        endpoint.path,
                        endpoint.method,
                        endpoint.description
                    )
                print(f"  ✅ {len(api_data.endpoints)} endpoints ajoutés")
    
    print(f"\n✨ SYNCHRONISATION TERMINÉE")
    print(f"  • Créées : {created_count}")
    print(f"  • Mises à jour : {updated_count}")
    
    return {
        "status": "success",
        "message": f"{created_count + updated_count} APIs synchronisées",
        "created": created_count,
        "updated": updated_count,
        "api_ids": created_api_ids,
    }


# ── Endpoint health check pour tester le webhook ──
@router.post("/test")
async def test_webhook():
    """
    Endpoint de test pour vérifier que le webhook fonctionne.
    
    Returns:
        {"status": "ok", "message": "Webhook est actif"}
    """
    print("✅ Test webhook reçu")
    return {
        "status": "ok",
        "message": "Webhook est actif et prêt à recevoir les données"
    }