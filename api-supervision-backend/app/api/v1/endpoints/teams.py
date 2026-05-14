from typing import List
from uuid import UUID
import random
import string

import asyncpg
from fastapi import APIRouter, Depends, HTTPException, status

from app.core.database import get_conn
from app.core.security import get_current_user_id
from app.schemas.schemas import (
    TeamCreate,
    TeamResponse,
    TeamMemberResponse,
    TeamInvitationResponse,
    MessageResponse,
    JoinTeamRequestCreate,
    JoinTeamRequestResponse,
)
from app.services.email_service import send_invitation_email

router = APIRouter(prefix="/teams", tags=["Teams"])


def generate_invite_code() -> str:
    return (
        "TEAM-"
        + "".join(random.choices(string.ascii_uppercase + string.digits, k=4))
        + "-"
        + "".join(random.choices(string.ascii_uppercase + string.digits, k=4))
    )


# IMPORTANT : routes statiques AVANT /{team_id}

@router.get("/invitations/pending", response_model=List[TeamInvitationResponse])
async def get_pending_invitations(
    conn: asyncpg.Connection = Depends(get_conn),
    user_id: str = Depends(get_current_user_id),
):
    rows = await conn.fetch(
        """
        SELECT ti.id, ti.team_id, t.name, t.description, ti.role, ti.created_at
        FROM team_invitations ti
        JOIN teams t ON ti.team_id = t.id
        WHERE ti.invited_user_id = $1 AND ti.status = 'pending'
        ORDER BY ti.created_at DESC
        """,
        UUID(user_id),
    )

    return [dict(r) for r in rows]


@router.post("/invitations/{invitation_id}/accept", response_model=MessageResponse)
async def accept_invitation_by_id(
    invitation_id: UUID,
    conn: asyncpg.Connection = Depends(get_conn),
    user_id: str = Depends(get_current_user_id),
):
    invitation = await conn.fetchrow(
        """
        SELECT id, team_id, invited_user_id, role, status
        FROM team_invitations
        WHERE id = $1
        """,
        invitation_id,
    )

    if not invitation:
        raise HTTPException(status_code=404, detail="Invitation introuvable")

    if invitation["invited_user_id"] != UUID(user_id):
        raise HTTPException(
            status_code=403,
            detail="Cette invitation ne vous appartient pas",
        )

    if invitation["status"] != "pending":
        raise HTTPException(
            status_code=400,
            detail="Invitation déjà traitée",
        )

    already_member = await conn.fetchval(
        """
        SELECT 1
        FROM team_members
        WHERE team_id = $1 AND user_id = $2
        """,
        invitation["team_id"],
        UUID(user_id),
    )

    if not already_member:
        await conn.execute(
            """
            INSERT INTO team_members (team_id, user_id, role)
            VALUES ($1, $2, $3)
            """,
            invitation["team_id"],
            UUID(user_id),
            invitation["role"],
        )

    await conn.execute(
        """
        UPDATE team_invitations
        SET status = 'accepted'
        WHERE id = $1
        """,
        invitation_id,
    )

    return {"message": "Invitation acceptée avec succès"}


@router.post("/invitations/{invitation_id}/reject", response_model=MessageResponse)
async def reject_invitation_by_id(
    invitation_id: UUID,
    conn: asyncpg.Connection = Depends(get_conn),
    user_id: str = Depends(get_current_user_id),
):
    invitation = await conn.fetchrow(
        """
        SELECT id, invited_user_id, status
        FROM team_invitations
        WHERE id = $1
        """,
        invitation_id,
    )

    if not invitation:
        raise HTTPException(status_code=404, detail="Invitation introuvable")

    if invitation["invited_user_id"] != UUID(user_id):
        raise HTTPException(
            status_code=403,
            detail="Cette invitation ne vous appartient pas",
        )

    if invitation["status"] != "pending":
        raise HTTPException(
            status_code=400,
            detail="Invitation déjà traitée",
        )

    await conn.execute(
        """
        UPDATE team_invitations
        SET status = 'rejected'
        WHERE id = $1
        """,
        invitation_id,
    )

    return {"message": "Invitation refusée"}


@router.get("/", response_model=List[TeamResponse])
async def get_all_teams(
    conn: asyncpg.Connection = Depends(get_conn),
    user_id: str = Depends(get_current_user_id),
):
    rows = await conn.fetch(
        """
        SELECT DISTINCT t.id, t.name, t.description, t.invite_code,
               t.owner_id, t.is_active, t.created_at, t.updated_at
        FROM teams t
        JOIN team_members tm ON t.id = tm.team_id
        WHERE tm.user_id = $1
        ORDER BY t.created_at DESC
        """,
        UUID(user_id),
    )

    return [dict(r) for r in rows]


@router.post("/", response_model=TeamResponse)
async def create_team(
    data: TeamCreate,
    conn: asyncpg.Connection = Depends(get_conn),
    user_id: str = Depends(get_current_user_id),
):
    invite_code = generate_invite_code()

    row = await conn.fetchrow(
        """
        INSERT INTO teams (name, description, invite_code, owner_id, is_active)
        VALUES ($1, $2, $3, $4, TRUE)
        RETURNING id, name, description, invite_code, owner_id, is_active, created_at, updated_at
        """,
        data.name,
        data.description,
        invite_code,
        UUID(user_id),
    )

    await conn.execute(
        """
        INSERT INTO team_members (team_id, user_id, role)
        VALUES ($1, $2, 'owner')
        """,
        row["id"],
        UUID(user_id),
    )

    return dict(row)


@router.post("/join-requests", response_model=MessageResponse)
async def create_join_request(
    data: JoinTeamRequestCreate,
    conn: asyncpg.Connection = Depends(get_conn),
    user_id: str = Depends(get_current_user_id),
):
    team = await conn.fetchrow("""
        SELECT id, name
        FROM teams
        WHERE invite_code = $1 AND is_active = TRUE
    """, data.invite_code)

    if not team:
        raise HTTPException(status_code=404, detail="Code d'équipe invalide")

    already_member = await conn.fetchval("""
        SELECT 1
        FROM team_members
        WHERE team_id = $1 AND user_id = $2
    """, team["id"], UUID(user_id))

    if already_member:
        raise HTTPException(status_code=400, detail="Vous êtes déjà membre de cette équipe")

    existing_request = await conn.fetchrow("""
        SELECT id, status
        FROM team_join_requests
        WHERE team_id = $1 AND user_id = $2 AND status = 'pending'
    """, team["id"], UUID(user_id))

    if existing_request:
        raise HTTPException(status_code=400, detail="Demande déjà envoyée et en attente")

    await conn.execute("""
        INSERT INTO team_join_requests (team_id, user_id, status)
        VALUES ($1, $2, 'pending')
    """, team["id"], UUID(user_id))

    return {"message": f"Demande envoyée à l’administrateur de l’équipe {team['name']}"}


@router.get("/join-requests/incoming", response_model=List[JoinTeamRequestResponse])
async def get_incoming_join_requests(
    conn: asyncpg.Connection = Depends(get_conn),
    user_id: str = Depends(get_current_user_id),
):
    rows = await conn.fetch("""
        SELECT
            tjr.id,
            tjr.team_id,
            t.name AS team_name,
            tjr.user_id,
            u.name AS user_name,
            u.email AS user_email,
            tjr.status,
            tjr.created_at
        FROM team_join_requests tjr
        JOIN teams t ON tjr.team_id = t.id
        JOIN users u ON tjr.user_id = u.id
        JOIN team_members tm ON tm.team_id = t.id
        WHERE tm.user_id = $1
          AND tm.role IN ('owner', 'admin')
          AND tjr.status = 'pending'
        ORDER BY tjr.created_at DESC
    """, UUID(user_id))

    return [dict(r) for r in rows]


@router.post("/join-requests/{request_id}/approve", response_model=MessageResponse)
async def approve_join_request(
    request_id: UUID,
    conn: asyncpg.Connection = Depends(get_conn),
    user_id: str = Depends(get_current_user_id),
):
    request = await conn.fetchrow("""
        SELECT id, team_id, user_id, status
        FROM team_join_requests
        WHERE id = $1
    """, request_id)

    if not request:
        raise HTTPException(status_code=404, detail="Demande introuvable")

    if request["status"] != "pending":
        raise HTTPException(status_code=400, detail="Demande déjà traitée")

    can_manage = await conn.fetchval("""
        SELECT 1
        FROM team_members
        WHERE team_id = $1
          AND user_id = $2
          AND role IN ('owner', 'admin')
    """, request["team_id"], UUID(user_id))

    if not can_manage:
        raise HTTPException(status_code=403, detail="Vous n'avez pas le droit de valider cette demande")

    already_member = await conn.fetchval("""
        SELECT 1
        FROM team_members
        WHERE team_id = $1 AND user_id = $2
    """, request["team_id"], request["user_id"])

    if not already_member:
        await conn.execute("""
            INSERT INTO team_members (team_id, user_id, role)
            VALUES ($1, $2, 'member')
        """, request["team_id"], request["user_id"])

    await conn.execute("""
        UPDATE team_join_requests
        SET status = 'approved',
            reviewed_at = NOW(),
            reviewed_by_id = $2
        WHERE id = $1
    """, request_id, UUID(user_id))

    return {"message": "Demande acceptée. L’utilisateur a été ajouté à l’équipe."}


@router.post("/join-requests/{request_id}/reject", response_model=MessageResponse)
async def reject_join_request(
    request_id: UUID,
    conn: asyncpg.Connection = Depends(get_conn),
    user_id: str = Depends(get_current_user_id),
):
    request = await conn.fetchrow("""
        SELECT id, team_id, status
        FROM team_join_requests
        WHERE id = $1
    """, request_id)

    if not request:
        raise HTTPException(status_code=404, detail="Demande introuvable")

    if request["status"] != "pending":
        raise HTTPException(status_code=400, detail="Demande déjà traitée")

    can_manage = await conn.fetchval("""
        SELECT 1
        FROM team_members
        WHERE team_id = $1
          AND user_id = $2
          AND role IN ('owner', 'admin')
    """, request["team_id"], UUID(user_id))

    if not can_manage:
        raise HTTPException(status_code=403, detail="Vous n'avez pas le droit de refuser cette demande")

    await conn.execute("""
        UPDATE team_join_requests
        SET status = 'rejected',
            reviewed_at = NOW(),
            reviewed_by_id = $2
        WHERE id = $1
    """, request_id, UUID(user_id))

    return {"message": "Demande refusée"}







@router.post("/{team_id}/invite", response_model=MessageResponse)
async def invite_user_to_team(
    team_id: UUID,
    email: str,
    role: str = "member",
    conn: asyncpg.Connection = Depends(get_conn),
    user_id: str = Depends(get_current_user_id),
):
    owner = await conn.fetchval(
        """
        SELECT owner_id
        FROM teams
        WHERE id = $1
        """,
        team_id,
    )

    if not owner:
        raise HTTPException(status_code=404, detail="Équipe introuvable")

    if owner != UUID(user_id):
        raise HTTPException(
            status_code=403,
            detail="Vous n'êtes pas propriétaire de cette équipe",
        )

    invited_user = await conn.fetchrow(
        """
        SELECT id, name, email
        FROM users
        WHERE email = $1 AND is_active = TRUE
        """,
        email,
    )

    if not invited_user:
        raise HTTPException(
            status_code=404,
            detail=f"Utilisateur avec l'email {email} non trouvé",
        )

    invited_user_id = invited_user["id"]

    already_member = await conn.fetchval(
        """
        SELECT 1
        FROM team_members
        WHERE team_id = $1 AND user_id = $2
        """,
        team_id,
        invited_user_id,
    )

    if already_member:
        raise HTTPException(
            status_code=400,
            detail="Cet utilisateur est déjà membre de l'équipe",
        )

    existing_pending = await conn.fetchrow(
        """
        SELECT id
        FROM team_invitations
        WHERE team_id = $1
          AND invited_user_id = $2
          AND status = 'pending'
        """,
        team_id,
        invited_user_id,
    )

    if existing_pending:
        invitation_id = existing_pending["id"]
    else:
        invitation = await conn.fetchrow(
            """
            INSERT INTO team_invitations (team_id, invited_user_id, invited_by_id, role, status)
            VALUES ($1, $2, $3, $4, 'pending')
            RETURNING id
            """,
            team_id,
            invited_user_id,
            UUID(user_id),
            role,
        )
        invitation_id = invitation["id"]

    team_name = await conn.fetchval(
        "SELECT name FROM teams WHERE id = $1",
        team_id,
    )

    inviter_name = await conn.fetchval(
        "SELECT name FROM users WHERE id = $1",
        UUID(user_id),
    )

    acceptance_link = f"http://localhost:3000/teams/invitations/{invitation_id}/accept"
    rejection_link = f"http://localhost:3000/teams/invitations/{invitation_id}/reject"

    send_invitation_email(
        to_email=email,
        team_name=team_name,
        invited_by=inviter_name,
        acceptance_link=acceptance_link,
        rejection_link=rejection_link,
    )

    if existing_pending:
        return {"message": f"Invitation déjà en attente. Email renvoyé à {email} ✅"}

    return {"message": f"Invitation envoyée à {email} ✅"}


@router.get("/{team_id}", response_model=TeamResponse)
async def get_team(
    team_id: UUID,
    conn: asyncpg.Connection = Depends(get_conn),
    user_id: str = Depends(get_current_user_id),
):
    is_member = await conn.fetchval(
        """
        SELECT 1
        FROM team_members
        WHERE team_id = $1 AND user_id = $2
        """,
        team_id,
        UUID(user_id),
    )

    if not is_member:
        raise HTTPException(
            status_code=403,
            detail="Vous n'êtes pas membre de cette équipe",
        )

    row = await conn.fetchrow(
        """
        SELECT id, name, description, invite_code, owner_id, is_active, created_at, updated_at
        FROM teams
        WHERE id = $1
        """,
        team_id,
    )

    if not row:
        raise HTTPException(status_code=404, detail="Équipe introuvable")

    return dict(row)


@router.put("/{team_id}", response_model=TeamResponse)
async def update_team(
    team_id: UUID,
    data: TeamCreate,
    conn: asyncpg.Connection = Depends(get_conn),
    user_id: str = Depends(get_current_user_id),
):
    owner = await conn.fetchval(
        """
        SELECT owner_id
        FROM teams
        WHERE id = $1
        """,
        team_id,
    )

    if owner != UUID(user_id):
        raise HTTPException(
            status_code=403,
            detail="Vous n'êtes pas propriétaire de cette équipe",
        )

    row = await conn.fetchrow(
        """
        UPDATE teams
        SET name = $1, description = $2, updated_at = NOW()
        WHERE id = $3
        RETURNING id, name, description, invite_code, owner_id, is_active, created_at, updated_at
        """,
        data.name,
        data.description,
        team_id,
    )

    return dict(row)


@router.delete("/{team_id}")
async def delete_team(
    team_id: UUID,
    conn: asyncpg.Connection = Depends(get_conn),
    user_id: str = Depends(get_current_user_id),
):
    owner = await conn.fetchval(
        """
        SELECT owner_id
        FROM teams
        WHERE id = $1
        """,
        team_id,
    )

    if owner != UUID(user_id):
        raise HTTPException(
            status_code=403,
            detail="Vous n'êtes pas propriétaire de cette équipe",
        )

    await conn.execute(
        """
        DELETE FROM teams
        WHERE id = $1
        """,
        team_id,
    )

    return {"deleted": True}


@router.get("/{team_id}/members", response_model=List[TeamMemberResponse])
async def get_team_members(
    team_id: UUID,
    conn: asyncpg.Connection = Depends(get_conn),
    user_id: str = Depends(get_current_user_id),
):
    is_member = await conn.fetchval(
        """
        SELECT 1
        FROM team_members
        WHERE team_id = $1 AND user_id = $2
        """,
        team_id,
        UUID(user_id),
    )

    if not is_member:
        raise HTTPException(
            status_code=403,
            detail="Vous n'êtes pas membre de cette équipe",
        )

    rows = await conn.fetch(
        """
        SELECT tm.user_id, u.name, u.email, tm.role, tm.joined_at
        FROM team_members tm
        JOIN users u ON tm.user_id = u.id
        WHERE tm.team_id = $1
        ORDER BY tm.joined_at ASC
        """,
        team_id,
    )

    return [dict(r) for r in rows]


@router.delete("/{team_id}/members/{member_id}")
async def remove_team_member(
    team_id: UUID,
    member_id: UUID,
    conn: asyncpg.Connection = Depends(get_conn),
    user_id: str = Depends(get_current_user_id),
):
    owner = await conn.fetchval(
        """
        SELECT owner_id
        FROM teams
        WHERE id = $1
        """,
        team_id,
    )

    if owner != UUID(user_id):
        raise HTTPException(
            status_code=403,
            detail="Vous n'êtes pas propriétaire de cette équipe",
        )

    if member_id == owner:
        raise HTTPException(
            status_code=400,
            detail="Impossible de supprimer le propriétaire de l'équipe",
        )

    await conn.execute(
        """
        DELETE FROM team_members
        WHERE team_id = $1 AND user_id = $2
        """,
        team_id,
        member_id,
    )

    return {"deleted": True}