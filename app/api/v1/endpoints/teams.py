from typing import List, Optional
from uuid import UUID
from fastapi import APIRouter, Depends
import asyncpg
from datetime import datetime

from app.core.database import get_conn
from app.core.security import get_current_user_id
from app.schemas.schemas import (
    TeamCreate, TeamResponse, TeamMemberResponse, 
    TeamInvitationResponse, MessageResponse
)
from app.services.email_service import send_invitation_email

print("🔴 CHARGEMENT DU MODULE TEAMS")

router = APIRouter(prefix="/teams", tags=["Teams"])


# ── GET tous les teams de l'utilisateur connecté ──
@router.get("/", response_model=List[TeamResponse])
async def get_all_teams(
    conn: asyncpg.Connection = Depends(get_conn),
    user_id: str = Depends(get_current_user_id),
):
    """
    Récupère tous les teams où l'utilisateur est membre.
    """
    rows = await conn.fetch("""
        SELECT DISTINCT t.id, t.name, t.description, t.invite_code, 
               t.owner_id, t.is_active, t.created_at, t.updated_at
        FROM teams t
        JOIN team_members tm ON t.id = tm.team_id
        WHERE tm.user_id = $1
        ORDER BY t.created_at DESC
    """, UUID(user_id))
    return [dict(r) for r in rows]


# ── GET un team spécifique avec ses membres ──
@router.get("/{team_id}", response_model=TeamResponse)
async def get_team(
    team_id: UUID,
    conn: asyncpg.Connection = Depends(get_conn),
    user_id: str = Depends(get_current_user_id),
):
    """
    Récupère les détails d'un team + sa liste de membres.
    """
    # Vérifier que l'utilisateur est membre du team
    is_member = await conn.fetchval("""
        SELECT 1 FROM team_members WHERE team_id = $1 AND user_id = $2
    """, team_id, UUID(user_id))
    
    if not is_member:
        raise ValueError("Vous n'êtes pas membre de ce team")
    
    row = await conn.fetchrow("""
        SELECT id, name, description, invite_code, owner_id, is_active, created_at, updated_at
        FROM teams
        WHERE id = $1
    """, team_id)
    
    if not row:
        raise ValueError("Team non trouvé")
    
    return dict(row)


# ── POST créer un nouveau team ──
@router.post("/", response_model=TeamResponse)
async def create_team(
    data: TeamCreate,
    conn: asyncpg.Connection = Depends(get_conn),
    user_id: str = Depends(get_current_user_id),
):
    """
    Crée un nouveau team. L'utilisateur connecté en devient propriétaire.
    """
    # Générer un code d'invitation unique
    import random
    import string
    invite_code = f"TEAM-{''.join(random.choices(string.ascii_uppercase + string.digits, k=4))}-{''.join(random.choices(string.ascii_uppercase + string.digits, k=4))}"
    
    row = await conn.fetchrow("""
        INSERT INTO teams (name, description, invite_code, owner_id, is_active)
        VALUES ($1, $2, $3, $4, TRUE)
        RETURNING id, name, description, invite_code, owner_id, is_active, created_at, updated_at
    """, data.name, data.description, invite_code, UUID(user_id))
    
    # Ajouter le propriétaire comme membre
    await conn.execute("""
        INSERT INTO team_members (team_id, user_id, role)
        VALUES ($1, $2, 'owner')
    """, row['id'], UUID(user_id))
    
    return dict(row)


# ── PUT modifier un team ──
@router.put("/{team_id}", response_model=TeamResponse)
async def update_team(
    team_id: UUID,
    data: TeamCreate,
    conn: asyncpg.Connection = Depends(get_conn),
    user_id: str = Depends(get_current_user_id),
):
    """
    Modifie un team (propriétaire uniquement).
    """
    # Vérifier que l'utilisateur est propriétaire
    owner = await conn.fetchval("""
        SELECT owner_id FROM teams WHERE id = $1
    """, team_id)
    
    if owner != UUID(user_id):
        raise PermissionError("Vous n'êtes pas propriétaire de ce team")
    
    row = await conn.fetchrow("""
        UPDATE teams
        SET name = $1, description = $2, updated_at = NOW()
        WHERE id = $3
        RETURNING id, name, description, invite_code, owner_id, is_active, created_at, updated_at
    """, data.name, data.description, team_id)
    
    return dict(row)


# ── DELETE supprimer un team ──
@router.delete("/{team_id}")
async def delete_team(
    team_id: UUID,
    conn: asyncpg.Connection = Depends(get_conn),
    user_id: str = Depends(get_current_user_id),
):
    """
    Supprime un team (propriétaire uniquement).
    """
    # Vérifier que l'utilisateur est propriétaire
    owner = await conn.fetchval("""
        SELECT owner_id FROM teams WHERE id = $1
    """, team_id)
    
    if owner != UUID(user_id):
        raise PermissionError("Vous n'êtes pas propriétaire de ce team")
    
    await conn.execute("DELETE FROM teams WHERE id = $1", team_id)
    return {"deleted": True}


# ── GET membres d'un team ──
@router.get("/{team_id}/members", response_model=List[TeamMemberResponse])
async def get_team_members(
    team_id: UUID,
    conn: asyncpg.Connection = Depends(get_conn),
    user_id: str = Depends(get_current_user_id),
):
    """
    Récupère tous les membres d'un team.
    """
    # Vérifier que l'utilisateur est membre du team
    is_member = await conn.fetchval("""
        SELECT 1 FROM team_members WHERE team_id = $1 AND user_id = $2
    """, team_id, UUID(user_id))
    
    if not is_member:
        raise ValueError("Vous n'êtes pas membre de ce team")
    
    rows = await conn.fetch("""
        SELECT tm.user_id, u.name, u.email, tm.role, tm.joined_at
        FROM team_members tm
        JOIN users u ON tm.user_id = u.id
        WHERE tm.team_id = $1
        ORDER BY tm.joined_at ASC
    """, team_id)
    
    return [dict(r) for r in rows]


# ── POST inviter un utilisateur ──
@router.post("/{team_id}/invite", response_model=MessageResponse)
async def invite_user_to_team(
    team_id: UUID,
    email: str,
    role: str = "member",
    conn: asyncpg.Connection = Depends(get_conn),
    user_id: str = Depends(get_current_user_id),
):
    """
    Envoie une invitation à un utilisateur pour rejoindre le team.
    """
    print(f"🔴 ENDPOINT /invite APPELÉ avec email={email}, team_id={team_id}")
    
    # Vérifier que l'utilisateur est owner du team
    owner = await conn.fetchval("""
        SELECT owner_id FROM teams WHERE id = $1
    """, team_id)
    
    if owner != UUID(user_id):
        raise PermissionError("Vous n'êtes pas propriétaire de ce team")
    
    # Chercher l'utilisateur par email
    invited_user = await conn.fetchrow("""
        SELECT id FROM users WHERE email = $1
    """, email)
    
    if not invited_user:
        raise ValueError(f"Utilisateur avec l'email {email} non trouvé")
    
    invited_user_id = invited_user['id']
    
    # Vérifier qu'il n'est pas déjà membre
    already_member = await conn.fetchval("""
        SELECT 1 FROM team_members WHERE team_id = $1 AND user_id = $2
    """, team_id, invited_user_id)
    
    if already_member:
        raise ValueError("Cet utilisateur est déjà membre du team")
    
    # Créer une invitation
    invitation = await conn.fetchrow("""
        INSERT INTO team_invitations (team_id, invited_user_id, invited_by_id, role, status)
        VALUES ($1, $2, $3, $4, 'pending')
        RETURNING id
    """, team_id, invited_user_id, UUID(user_id), role)
    
    # Récupérer les infos du team et de l'inviteur
    team_name = await conn.fetchval("SELECT name FROM teams WHERE id = $1", team_id)
    inviter_name = await conn.fetchval("SELECT name FROM users WHERE id = $1", UUID(user_id))
    
    # Créer les liens d'acceptation/rejet
    acceptance_link = f"http://localhost:3000/invitations/{invitation['id']}/accept"
    rejection_link = f"http://localhost:3000/invitations/{invitation['id']}/reject"
    
    # DEBUG
    print(f"🔴 AVANT D'ENVOYER L'EMAIL")
    print(f"Email: {email}")
    print(f"Team: {team_name}")
    print(f"Inviter: {inviter_name}")
    
    # Envoyer l'email
    print("🔴 APPEL DE send_invitation_email...")
    send_invitation_email(
        to_email=email,
        team_name=team_name,
        invited_by=inviter_name,
        acceptance_link=acceptance_link,
        rejection_link=rejection_link,
    )
    print("🔴 APPEL TERMINE")
    
    return {"message": f"Invitation envoyée à {email} ✅"}


# ── POST accepter une invitation ──
@router.post("/{team_id}/accept-invitation", response_model=MessageResponse)
async def accept_team_invitation(
    team_id: UUID,
    conn: asyncpg.Connection = Depends(get_conn),
    user_id: str = Depends(get_current_user_id),
):
    """
    Accepte une invitation pour rejoindre un team.
    """
    print(f"🔴 ACCEPT INVITATION - team_id={team_id}, user_id={user_id}")
    
    # Vérifier qu'il y a une invitation pending
    invitation = await conn.fetchrow("""
        SELECT id, role FROM team_invitations 
        WHERE team_id = $1 AND invited_user_id = $2 AND status = 'pending'
    """, team_id, UUID(user_id))
    
    if not invitation:
        print("⚠️ Aucune invitation pending, mais l'utilisateur peut déjà être membre")
        return {"message": "Vous êtes déjà membre de ce team"}
    
    # Vérifier que l'utilisateur n'est pas déjà membre
    already_member = await conn.fetchval("""
        SELECT 1 FROM team_members WHERE team_id = $1 AND user_id = $2
    """, team_id, UUID(user_id))
    
    if already_member:
        print("⚠️ Utilisateur est déjà membre, juste marquer l'invitation comme acceptée")
        # Marquer TOUTES les invitations de ce user pour ce team comme acceptées
        await conn.execute("""
            UPDATE team_invitations
            SET status = 'accepted'
            WHERE team_id = $1 AND invited_user_id = $2 AND status = 'pending'
        """, team_id, UUID(user_id))
        return {"message": "Vous êtes déjà membre de ce team"}
    
    # Ajouter l'utilisateur comme membre
    print(f"📝 Ajout de l'utilisateur comme membre avec rôle {invitation['role']}")
    await conn.execute("""
        INSERT INTO team_members (team_id, user_id, role)
        VALUES ($1, $2, $3)
    """, team_id, UUID(user_id), invitation['role'])
    
    # Marquer l'invitation comme acceptée
    print("✅ Marquage de l'invitation comme acceptée")
    await conn.execute("""
        UPDATE team_invitations
        SET status = 'accepted'
        WHERE id = $1
    """, invitation['id'])
    
    print("✅ ACCEPTATION COMPLETE")
    return {"message": "Vous avez rejoint le team"}

# ── POST rejeter une invitation ──
@router.post("/{team_id}/reject-invitation", response_model=MessageResponse)
async def reject_team_invitation(
    team_id: UUID,
    conn: asyncpg.Connection = Depends(get_conn),
    user_id: str = Depends(get_current_user_id),
):
    """
    Rejette une invitation pour rejoindre un team.
    """
    await conn.execute("""
        UPDATE team_invitations
        SET status = 'rejected'
        WHERE team_id = $1 AND invited_user_id = $2 AND status = 'pending'
    """, team_id, UUID(user_id))
    
    return {"message": "Invitation rejetée"}


# ── DELETE supprimer un membre du team ──
@router.delete("/{team_id}/members/{member_id}")
async def remove_team_member(
    team_id: UUID,
    member_id: UUID,
    conn: asyncpg.Connection = Depends(get_conn),
    user_id: str = Depends(get_current_user_id),
):
    """
    Supprime un membre du team (owner uniquement).
    """
    # Vérifier que l'utilisateur est owner du team
    owner = await conn.fetchval("""
        SELECT owner_id FROM teams WHERE id = $1
    """, team_id)
    
    if owner != UUID(user_id):
        raise PermissionError("Vous n'êtes pas propriétaire de ce team")
    
    # Vérifier qu'on ne peut pas supprimer le propriétaire
    if member_id == owner:
        raise ValueError("Impossible de supprimer le propriétaire du team")
    
    await conn.execute("""
        DELETE FROM team_members WHERE team_id = $1 AND user_id = $2
    """, team_id, member_id)
    
    return {"deleted": True}


# ── GET invitations pending ──
@router.get("/invitations/pending", response_model=List[TeamInvitationResponse])
async def get_pending_invitations(
    conn: asyncpg.Connection = Depends(get_conn),
    user_id: str = Depends(get_current_user_id),
):
    """
    Récupère toutes les invitations pending de l'utilisateur.
    """
    rows = await conn.fetch("""
        SELECT ti.id, ti.team_id, t.name, t.description, ti.role, ti.created_at
        FROM team_invitations ti
        JOIN teams t ON ti.team_id = t.id
        WHERE ti.invited_user_id = $1 AND ti.status = 'pending'
        ORDER BY ti.created_at DESC
    """, UUID(user_id))
    
    return [dict(r) for r in rows]