"""
app/workers/celery_tasks.py
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Tâches Celery pour la synchronisation automatique des APIs
"""

from celery import shared_task
from app.core.database import get_db_pool
import asyncio
from uuid import UUID
import httpx
from datetime import datetime
import json


# ── Task 1 : Sync périodique des API services ──
@shared_task
def sync_api_services_periodic():
    """
    Tâche Celery qui s'exécute toutes les X heures.
    Elle récupère les APIs de chaque projet et les synchronise.
    
    À configurer dans celery beat schedule
    """
    print("\n🔄 [CELERY] Synchronisation périodique des API services démarrée...")
    
    try:
        # Exécuter la tâche async
        result = asyncio.run(_sync_api_services())
        print(f"✅ [CELERY] Sync terminée : {result}")
        return result
    except Exception as e:
        print(f"❌ [CELERY] Erreur sync : {e}")
        raise


async def _sync_api_services():
    """Fonction async pour synchroniser les APIs"""
    try:
        pool = await get_db_pool()
    except Exception as e:
        print(f"⚠️  Impossible d'obtenir le pool DB : {e}")
        return {
            "projects_synced": 0,
            "total_apis": 0,
            "timestamp": datetime.now().isoformat(),
            "error": str(e)
        }
    
    async with pool.acquire() as conn:
        # Récupérer tous les projets
        projects = await conn.fetch("SELECT id, name FROM projects WHERE is_active = TRUE")
        print(f"📚 {len(projects)} projets actifs trouvés")
        
        total_updated = 0
        
        for project in projects:
            project_id = project['id']
            project_name = project['name']
            
            print(f"\n  📍 Projet : {project_name} ({project_id})")
            
            # Récupérer les APIs du projet
            apis = await conn.fetch(
                "SELECT id, name, base_url FROM api_services WHERE project_id = $1 AND is_active = TRUE",
                project_id
            )
            print(f"    ✅ {len(apis)} APIs actuellement assignées")
            total_updated += len(apis)
        
        return {
            "projects_synced": len(projects),
            "total_apis": total_updated,
            "timestamp": datetime.now().isoformat()
        }


# ── Task 2 : Health check des APIs ──
@shared_task
def check_api_health():
    """
    Tâche Celery qui vérifie la santé de chaque API service.
    Envoie un ping et enregistre le résultat dans health_checks.
    """
    print("\n🏥 [CELERY] Health check des APIs démarré...")
    
    try:
        result = asyncio.run(_check_apis_health())
        print(f"✅ [CELERY] Health checks terminés : {result}")
        return result
    except Exception as e:
        print(f"❌ [CELERY] Erreur health check : {e}")
        raise


async def _check_apis_health():
    """Fonction async pour vérifier la santé des APIs"""
    try:
        pool = await get_db_pool()
    except Exception as e:
        print(f"⚠️  Impossible d'obtenir le pool DB : {e}")
        return {
            "total_apis": 0,
            "healthy": 0,
            "unhealthy": 0,
            "timestamp": datetime.now().isoformat(),
            "error": str(e)
        }
    
    async with pool.acquire() as conn:
        # Récupérer toutes les APIs actives
        apis = await conn.fetch(
            "SELECT id, name, base_url FROM api_services WHERE is_active = TRUE"
        )
        
        print(f"🔍 Vérification de {len(apis)} APIs...")
        
        healthy = 0
        unhealthy = 0
        
        async with httpx.AsyncClient(timeout=5) as client:
            for api in apis:
                api_id = api['id']
                api_name = api['name']
                base_url = api['base_url']
                
                status = "unhealthy"
                error_msg = None
                
                try:
                    # Essayer un simple GET sur la base URL + /health
                    response = await client.get(f"{base_url}/health")
                    
                    if response.status_code in [200, 404]:  # 404 si pas de /health, c'est ok
                        status = "healthy"
                        healthy += 1
                        print(f"  ✅ {api_name} : {response.status_code}")
                    else:
                        status = "unhealthy"
                        unhealthy += 1
                        error_msg = f"HTTP {response.status_code}"
                        print(f"  ❌ {api_name} : {response.status_code}")
                
                except asyncio.TimeoutError:
                    status = "unhealthy"
                    unhealthy += 1
                    error_msg = "Timeout"
                    print(f"  ❌ {api_name} : Timeout")
                
                except Exception as e:
                    status = "unhealthy"
                    unhealthy += 1
                    error_msg = str(e)
                    print(f"  ❌ {api_name} : {error_msg}")
                
                # Enregistrer le résultat dans health_checks
                try:
                    await conn.execute(
                        """
                        INSERT INTO health_checks (api_service_id, status, response_time, error_message, created_at)
                        VALUES ($1, $2, 0, $3, NOW())
                        """,
                        api_id,
                        status,
                        error_msg
                    )
                except Exception as db_error:
                    print(f"  ⚠️  Erreur insertion health_check : {db_error}")
        
        return {
            "total_apis": len(apis),
            "healthy": healthy,
            "unhealthy": unhealthy,
            "timestamp": datetime.now().isoformat()
        }


# ── Task 3 : Découverte automatique des endpoints ──
@shared_task
def discover_api_endpoints():
    """
    Tâche Celery qui découvre automatiquement les endpoints d'une API
    en lisant son fichier Swagger/OpenAPI.
    """
    print("\n🔍 [CELERY] Découverte des endpoints démarrée...")
    
    try:
        result = asyncio.run(_discover_endpoints())
        print(f"✅ [CELERY] Découverte terminée : {result}")
        return result
    except Exception as e:
        print(f"❌ [CELERY] Erreur découverte : {e}")
        raise


async def _discover_endpoints():
    """Fonction async pour découvrir les endpoints"""
    try:
        pool = await get_db_pool()
    except Exception as e:
        print(f"⚠️  Impossible d'obtenir le pool DB : {e}")
        return {
            "apis_scanned": 0,
            "with_swagger": 0,
            "timestamp": datetime.now().isoformat(),
            "error": str(e)
        }
    
    async with pool.acquire() as conn:
        # Récupérer toutes les APIs actives
        apis = await conn.fetch(
            "SELECT id, base_url FROM api_services WHERE is_active = TRUE LIMIT 10"
        )
        
        print(f"🔍 Scanning {len(apis)} APIs pour les endpoints...")
        
        discovered = 0
        
        async with httpx.AsyncClient(timeout=10) as client:
            for api in apis:
                api_id = api['id']
                base_url = api['base_url']
                
                # Essayer de récupérer le fichier Swagger/OpenAPI
                swagger_urls = [
                    f"{base_url}/swagger.json",
                    f"{base_url}/openapi.json",
                    f"{base_url}/api/v1/openapi.json",
                    f"{base_url}/api/openapi.json",
                ]
                
                for swagger_url in swagger_urls:
                    try:
                        response = await client.get(swagger_url)
                        if response.status_code == 200:
                            print(f"  📋 Swagger trouvé : {swagger_url}")
                            
                            # Parser le JSON
                            try:
                                swagger_data = response.json()
                                
                                # Extraire les endpoints (paths)
                                paths = swagger_data.get('paths', {})
                                endpoint_count = 0
                                
                                for path, methods in paths.items():
                                    for method in methods.keys():
                                        if method.upper() in ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS']:
                                            try:
                                                # Insérer l'endpoint
                                                await conn.execute(
                                                    """
                                                    INSERT INTO endpoints (api_service_id, path, method, is_active, created_at)
                                                    VALUES ($1, $2, $3, TRUE, NOW())
                                                    ON CONFLICT DO NOTHING
                                                    """,
                                                    api_id,
                                                    path,
                                                    method.upper()
                                                )
                                                endpoint_count += 1
                                            except Exception as e:
                                                print(f"    ⚠️  Erreur insertion endpoint : {e}")
                                
                                print(f"    ✅ {endpoint_count} endpoints découverts et insérés")
                                discovered += 1
                            except json.JSONDecodeError:
                                print(f"    ⚠️  JSON invalide")
                            
                            break
                    except Exception:
                        continue
        
        return {
            "apis_scanned": len(apis),
            "with_swagger": discovered,
            "timestamp": datetime.now().isoformat()
        }
