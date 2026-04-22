from typing import List
from uuid import UUID
from fastapi import APIRouter, Depends
import asyncpg
 
from app.core.database import get_conn
from app.core.security import get_current_user_id
from app.schemas.schemas import ProjectCreate, ProjectResponse, ProjectStatsResponse
from fastapi import APIRouter, Depends, HTTPException
router = APIRouter(prefix="/projects", tags=["Projects"])

@router.get("/my-projects", response_model=List[ProjectResponse])
async def get_my_projects(
    conn: asyncpg.Connection = Depends(get_conn),
    user_id: str = Depends(get_current_user_id),
):
    """
    Récupère les projets des équipes dont l'utilisateur est membre.
    ✅ ÉTAPE 5 : Charger les projets par équipe
    """
    print(f"🔴 GET /my-projects pour user_id={user_id}")
    
    rows = await conn.fetch("""
        SELECT DISTINCT 
            p.id, p.name, p.description, p.icon_key, p.color, 
            p.owner_id, p.team_id, p.is_active, p.created_at, p.updated_at
        FROM projects p
        JOIN teams t ON p.team_id = t.id
        JOIN team_members tm ON t.id = tm.team_id
        WHERE tm.user_id = $1 AND p.is_active = TRUE
        ORDER BY p.created_at DESC
    """, UUID(user_id))
    
    print(f"✅ Projets trouvés: {len(rows)}")
    return [dict(r) for r in rows]

# ══════════════════════════════════════════════════════════════════════
# 🔴 ENDPOINTS SPÉCIAUX EN PREMIER (avant les {id})
# ══════════════════════════════════════════════════════════════════════
@router.get("/{project_id}", response_model=ProjectResponse)
async def get_project_by_id(
    project_id: UUID,
    conn: asyncpg.Connection = Depends(get_conn),
    user_id: str = Depends(get_current_user_id),
):
    """
    Récupère un projet par son ID.
    """
    row = await conn.fetchrow("""
        SELECT id, name, description, icon_key, color, owner_id, team_id, is_active, created_at, updated_at
        FROM projects
        WHERE id = $1
    """, project_id)

    if not row:
        raise HTTPException(status_code=404, detail="Projet introuvable")

    return dict(row)


# ══════════════════════════════════════════════════════════════════════
# 📋 ENDPOINTS GÉNÉRAUX (après les spéciaux)
# ══════════════════════════════════════════════════════════════════════

@router.get("/", response_model=List[ProjectResponse])
async def get_all_projects(
    conn: asyncpg.Connection = Depends(get_conn),
    user_id: str = Depends(get_current_user_id),
):
    """
    Récupère tous les projets de l'utilisateur connecté (propriétaire).
    """
    rows = await conn.fetch("""
        SELECT id, name, description, icon_key, color, owner_id, team_id, is_active, created_at, updated_at
        FROM projects
        WHERE owner_id = $1
        ORDER BY created_at DESC
    """, UUID(user_id))
    return [dict(r) for r in rows]


@router.post("/", response_model=ProjectResponse)
async def create_project(
    data: ProjectCreate,
    conn: asyncpg.Connection = Depends(get_conn),
    user_id: str = Depends(get_current_user_id),
):
    """
    Crée un nouveau projet lié à une équipe.
    ✅ ÉTAPE 6 : Quand un projet est créé, l'assigner à une équipe (team_id)
    """
    print(f"🔴 CREATE project: name={data.name}, team_id={data.team_id}")
    
    row = await conn.fetchrow("""
        INSERT INTO projects (name, description, icon_key, color, owner_id, team_id, is_active)
        VALUES ($1, $2, $3, $4, $5, $6, TRUE)
        RETURNING id, name, description, icon_key, color, owner_id, team_id, is_active, created_at, updated_at
    """, data.name, data.description, data.icon_key, data.color, UUID(user_id), data.team_id)
    
    print(f"✅ Projet créé: {row['id']}")
    return dict(row)


@router.get("/my-projects", response_model=List[ProjectResponse])
async def get_my_projects(
    conn: asyncpg.Connection = Depends(get_conn),
    user_id: str = Depends(get_current_user_id),
):
    """
    Récupère les projets des équipes dont l'utilisateur est membre
    + les projets dont l'utilisateur est propriétaire.
    """
    print(f"🔴 GET /my-projects pour user_id={user_id}")
    
    # Récupérer les IDs des équipes de l'utilisateur
    team_ids = await conn.fetch("""
        SELECT t.id FROM teams t
        JOIN team_members tm ON t.id = tm.team_id
        WHERE tm.user_id = $1
    """, UUID(user_id))
    
    team_ids_list = [str(t['id']) for t in team_ids]
    print(f"📋 Équipes: {team_ids_list}")
    
    # Récupérer les projets
    if team_ids_list:
        # Projets de l'équipe OU propriétaire
        rows = await conn.fetch("""
            SELECT DISTINCT 
                p.id, p.name, p.description, p.icon_key, p.color, 
                p.owner_id, p.team_id, p.is_active, p.created_at, p.updated_at
            FROM projects p
            WHERE (
                p.team_id = ANY($1::UUID[])
                OR p.owner_id = $2
            )
            AND p.is_active = TRUE
            ORDER BY p.created_at DESC
        """, team_ids_list, UUID(user_id))
    else:
        # Juste les projets du propriétaire
        rows = await conn.fetch("""
            SELECT DISTINCT 
                p.id, p.name, p.description, p.icon_key, p.color, 
                p.owner_id, p.team_id, p.is_active, p.created_at, p.updated_at
            FROM projects p
            WHERE p.owner_id = $1 AND p.is_active = TRUE
            ORDER BY p.created_at DESC
        """, UUID(user_id))
    
    print(f"✅ Projets trouvés: {len(rows)}")
    return [dict(r) for r in rows]


@router.put("/{project_id}", response_model=ProjectResponse)
async def update_project(
    project_id: UUID,
    data: ProjectCreate,
    conn: asyncpg.Connection = Depends(get_conn),
    user_id: str = Depends(get_current_user_id),
):
    """
    Modifie un projet (propriétaire uniquement).
    """
    # Vérifier que l'utilisateur est propriétaire
    owner = await conn.fetchval("SELECT owner_id FROM projects WHERE id = $1", project_id)
    if owner != UUID(user_id):
        raise PermissionError("Vous n'êtes pas propriétaire de ce projet")
    
    row = await conn.fetchrow("""
        UPDATE projects
        SET name = $1, description = $2, icon_key = $3, color = $4, updated_at = NOW()
        WHERE id = $5
        RETURNING id, name, description, icon_key, color, owner_id, team_id, is_active, created_at, updated_at
    """, data.name, data.description, data.icon_key, data.color, project_id)
    
    return dict(row)


@router.delete("/{project_id}")
async def delete_project(
    project_id: UUID,
    conn: asyncpg.Connection = Depends(get_conn),
    user_id: str = Depends(get_current_user_id),
):
    """
    Supprime un projet (propriétaire uniquement).
    """
    # Vérifier que l'utilisateur est propriétaire
    owner = await conn.fetchval("SELECT owner_id FROM projects WHERE id = $1", project_id)
    if owner != UUID(user_id):
        raise PermissionError("Vous n'êtes pas propriétaire de ce projet")
    
    await conn.execute("DELETE FROM projects WHERE id = $1", project_id)
    return {"deleted": True}


@router.get("/{project_id}/stats", response_model=ProjectStatsResponse)
async def get_project_stats(
    project_id: UUID,
    conn: asyncpg.Connection = Depends(get_conn),
    _: str = Depends(get_current_user_id),
):
    """
    Récupère les statistiques du projet :
    - Nombre d'erreurs
    - Nombre de transactions
    - Crash Free Sessions %
    """
    # Erreurs (alertes critiques)
    errors = await conn.fetchval("""
        SELECT COUNT(*) FROM alerts
        WHERE project_id = $1 AND severity = 'CRITICAL'
    """, project_id)
    
    # Transactions (total requêtes)
    transactions = await conn.fetchval("""
        SELECT COUNT(*) FROM api_metrics
        WHERE endpoint_id IN (
            SELECT id FROM endpoints
            WHERE api_service_id IN (
                SELECT id FROM api_services WHERE project_id = $1
            )
        )
    """, project_id)
    
    # Crash Free Sessions (% de succès)
    total = await conn.fetchval("""
        SELECT COUNT(*) FROM api_metrics
        WHERE endpoint_id IN (
            SELECT id FROM endpoints
            WHERE api_service_id IN (
                SELECT id FROM api_services WHERE project_id = $1
            )
        )
    """, project_id)
    
    success = await conn.fetchval("""
        SELECT COUNT(*) FROM api_metrics
        WHERE endpoint_id IN (
            SELECT id FROM endpoints
            WHERE api_service_id IN (
                SELECT id FROM api_services WHERE project_id = $1
            )
        ) AND success = TRUE
    """, project_id)
    
    crash_free = (success / total * 100) if total and total > 0 else 0
    
    return {
        "errors": errors or 0,
        "transactions": transactions or 0,
        "crash_free_sessions": f"{crash_free:.2f}%",
    }

@router.get("/debug-my-projects")
async def debug_my_projects(
    conn: asyncpg.Connection = Depends(get_conn),
    user_id: str = Depends(get_current_user_id),
):
    """Debug - voir exactement ce qui se passe"""
    
    # Équipes de l'utilisateur
    teams = await conn.fetch("""
        SELECT t.id, t.name FROM teams t
        JOIN team_members tm ON t.id = tm.team_id
        WHERE tm.user_id = $1
    """, UUID(user_id))
    
    print(f"📋 Équipes de {user_id}: {teams}")
    
    # Projets avec team_id
    projects = await conn.fetch("""
        SELECT p.id, p.name, p.team_id, p.owner_id FROM projects p
        WHERE p.is_active = TRUE
        LIMIT 10
    """)
    
    print(f"📦 Tous les projets: {projects}")
    
    return {
        "user_id": user_id,
        "teams": [dict(t) for t in teams],
        "all_projects": [dict(p) for p in projects],
    }