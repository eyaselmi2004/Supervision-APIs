import React, { useEffect, useState } from 'react'
import {
  Plus,
  Trash2,
  Users,
  Copy,
  Check,
  Mail,
  Shield,
  X,
  FolderPlus,
  UserPlus,
  CheckCircle,
  XCircle,
} from 'lucide-react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Layout } from '../components/layout/Layout'
import { Header } from '../components/layout/Header'
import { Button } from '../components/ui/Button'
import { Modal } from '../components/ui/Modal'
import { Input } from '../components/ui/Input'
import { useAuth } from '../hooks/useAuth'
import { teamsService } from '../services/teams.service'

interface TeamMember {
  user_id?: string
  id?: string
  name: string
  email: string
  role: 'owner' | 'admin' | 'member'
  joined_at: string
}

interface Team {
  id: string
  name: string
  description?: string
  invite_code: string
  owner_id?: string
  is_active?: boolean
  member_count?: number
  created_at: string
  updated_at?: string
  members: TeamMember[]
}

interface JoinRequest {
  id: string
  team_id: string
  team_name: string
  user_id: string
  user_name: string
  user_email: string
  status: string
  created_at: string
}

export const TeamsPage: React.FC = () => {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { user } = useAuth()

  const [teams, setTeams] = useState<Team[]>([])
  const [joinRequests, setJoinRequests] = useState<JoinRequest[]>([])
  const [loading, setLoading] = useState(true)

  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showMembersModal, setShowMembersModal] = useState(false)
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [showJoinModal, setShowJoinModal] = useState(false)

  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [createdTeamId, setCreatedTeamId] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    name: '',
    description: '',
  })

  const [memberEmail, setMemberEmail] = useState('')
  const [memberRole, setMemberRole] = useState<'admin' | 'member'>('member')
  const [invitationLoading, setInvitationLoading] = useState(false)

  const [joinCode, setJoinCode] = useState('')
  const [joinLoading, setJoinLoading] = useState(false)

  useEffect(() => {
    const created = searchParams.get('created')
    const join = searchParams.get('join')

    if (created) {
      setCreatedTeamId(created)
    }

    if (join === 'true') {
      setShowJoinModal(true)
    }

    if (created || join) {
      setSearchParams({})
    }

    loadTeams()
    loadJoinRequests()
  }, [])

  const loadTeams = async () => {
    setLoading(true)

    try {
      const data = await teamsService.getAll()

      const teamsWithMembers = await Promise.all(
        data.map(async (team: any) => {
          try {
            const members = await teamsService.getMembers(team.id)

            return {
              ...team,
              members: members.map((m: any) => ({
                ...m,
                id: m.user_id,
              })),
              member_count: members.length,
            }
          } catch (e) {
            console.error(`Erreur chargement membres équipe ${team.id}:`, e)

            return {
              ...team,
              members: [],
              member_count: 0,
            }
          }
        })
      )

      setTeams(teamsWithMembers)
    } catch (e) {
      console.error('Erreur chargement équipes:', e)
      setTeams([])
    } finally {
      setLoading(false)
    }
  }

  const loadJoinRequests = async () => {
    try {
      const data = await teamsService.getIncomingJoinRequests()
      setJoinRequests(data)
    } catch (e) {
      console.error('Erreur chargement demandes:', e)
      setJoinRequests([])
    }
  }

  const resetCreateForm = () => {
    setFormData({
      name: '',
      description: '',
    })
  }

  const handleCreateTeam = async () => {
    if (!formData.name.trim()) {
      alert('Veuillez saisir un nom d’équipe')
      return
    }

    try {
      setLoading(true)

      const createdTeam = await teamsService.create({
        name: formData.name,
        description: formData.description,
      })

      resetCreateForm()
      setShowCreateModal(false)
      setCreatedTeamId(createdTeam.id)

      await loadTeams()
      await loadJoinRequests()
    } catch (e: any) {
      alert(`Erreur: ${e.response?.data?.detail || e.message}`)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteTeam = async (id: string) => {
    if (!confirm('Supprimer cette équipe ?')) return

    try {
      setLoading(true)
      await teamsService.delete(id)
      await loadTeams()
      await loadJoinRequests()
    } catch (e: any) {
      alert(`Erreur: ${e.response?.data?.detail || e.message}`)
    } finally {
      setLoading(false)
    }
  }

  const handleInviteMember = async () => {
    if (!memberEmail.trim() || !selectedTeam) return

    try {
      setInvitationLoading(true)

      const result = await teamsService.inviteUser(
        selectedTeam.id,
        memberEmail,
        memberRole
      )

      alert(result.message || 'Invitation envoyée !')

      setMemberEmail('')
      setMemberRole('member')
      setShowInviteModal(false)
    } catch (e: any) {
      alert(`Erreur: ${e.response?.data?.detail || e.message}`)
    } finally {
      setInvitationLoading(false)
    }
  }

  const handleJoinTeam = async () => {
    if (!joinCode.trim()) {
      alert('Veuillez entrer un code d’équipe')
      return
    }

    try {
      setJoinLoading(true)

      const result = await teamsService.createJoinRequest(joinCode.trim())

      alert(result.message || "Demande envoyée à l’administrateur de l’équipe ✅")

      setJoinCode('')
      setShowJoinModal(false)
    } catch (e: any) {
      alert(e.response?.data?.detail || "Erreur lors de l’envoi de la demande")
    } finally {
      setJoinLoading(false)
    }
  }

  const handleApproveJoinRequest = async (requestId: string) => {
    try {
      const result = await teamsService.approveJoinRequest(requestId)

      alert(result.message || 'Demande acceptée ✅')

      await loadTeams()
      await loadJoinRequests()
    } catch (e: any) {
      alert(e.response?.data?.detail || "Erreur lors de l’acceptation")
    }
  }

  const handleRejectJoinRequest = async (requestId: string) => {
    try {
      const result = await teamsService.rejectJoinRequest(requestId)

      alert(result.message || 'Demande refusée')

      await loadJoinRequests()
    } catch (e: any) {
      alert(e.response?.data?.detail || 'Erreur lors du refus')
    }
  }

  const handleRemoveMember = async (memberId: string) => {
    if (!selectedTeam) return
    if (!confirm('Supprimer ce membre ?')) return

    try {
      await teamsService.removeMember(selectedTeam.id, memberId)

      setSelectedTeam({
        ...selectedTeam,
        members: selectedTeam.members.filter(
          (m) => (m.id || m.user_id) !== memberId
        ),
      })

      await loadTeams()
    } catch (e: any) {
      alert(`Erreur: ${e.response?.data?.detail || e.message}`)
    }
  }

  const copyInviteCode = async (code: string, id: string) => {
    await navigator.clipboard.writeText(code)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'owner':
        return 'Propriétaire'
      case 'admin':
        return 'Admin'
      case 'member':
        return 'Membre'
      default:
        return role
    }
  }

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'owner':
        return { bg: 'rgba(217, 70, 239, 0.12)', text: '#d946ef' }
      case 'admin':
        return { bg: 'rgba(124, 58, 237, 0.12)', text: '#8b5cf6' }
      case 'member':
        return { bg: 'rgba(107, 114, 128, 0.12)', text: '#9ca3af' }
      default:
        return { bg: 'transparent', text: '#9ca3af' }
    }
  }

  const getCurrentUserRoleInTeam = (team: Team) => {
    const member = team.members?.find((m) => (m.user_id || m.id) === user?.id)
    return member?.role
  }

  const canManageTeam = (team: Team) => {
    const role = getCurrentUserRoleInTeam(team)
    return team.owner_id === user?.id || role === 'owner' || role === 'admin'
  }

  return (
    <Layout>
      <Header
        title="Équipes"
        subtitle="Gérez vos équipes, vos membres et vos codes d’invitation"
        actions={
          <div style={{ display: 'flex', gap: 12 }}>
            <button
              onClick={() => setShowJoinModal(true)}
              style={secondaryButtonStyle}
            >
              <UserPlus size={15} />
              Rejoindre une équipe
            </button>

            <Button icon={Plus} onClick={() => setShowCreateModal(true)}>
              Créer une équipe
            </Button>
          </div>
        }
      />

      <div style={{ padding: '28px 32px' }}>
        {createdTeamId && (
          <div style={successBannerStyle}>
            <div>
              <h3 style={bannerTitleStyle}>Équipe créée avec succès</h3>
              <p style={bannerTextStyle}>
                Vous pouvez maintenant créer un projet dans cette équipe ou copier son code
                d’invitation.
              </p>
            </div>

            <button
              onClick={() => navigate(`/projects?create=true&teamId=${createdTeamId}`)}
              style={primaryButtonStyle}
            >
              Créer un projet
            </button>
          </div>
        )}

        {joinRequests.length > 0 && (
          <div style={joinRequestsBoxStyle}>
            <h3 style={{ margin: '0 0 14px', color: 'var(--text-primary)' }}>
              Demandes d’adhésion en attente
            </h3>

            <div style={{ display: 'grid', gap: 12 }}>
              {joinRequests.map((request) => (
                <div key={request.id} style={joinRequestRowStyle}>
                  <div>
                    <strong style={{ color: 'var(--text-primary)' }}>
                      {request.user_name}
                    </strong>
                    <p style={{ margin: '4px 0 0', color: 'var(--text-muted)', fontSize: 13 }}>
                      {request.user_email} souhaite rejoindre l’équipe{' '}
                      <strong>{request.team_name}</strong>
                    </p>
                  </div>

                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      onClick={() => handleApproveJoinRequest(request.id)}
                      style={primaryButtonStyle}
                    >
                      <CheckCircle size={15} />
                      Accepter
                    </button>

                    <button
                      onClick={() => handleRejectJoinRequest(request.id)}
                      style={dangerLightButtonStyle}
                    >
                      <XCircle size={15} />
                      Refuser
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {loading ? (
          <p style={{ color: 'var(--text-muted)' }}>Chargement...</p>
        ) : teams.length === 0 ? (
          <div style={emptyStateStyle}>
            <Users size={42} color="#E07FA0" />

            <h3 style={{ margin: '16px 0 8px', fontSize: 20, color: 'var(--text-primary)' }}>
              Aucune équipe
            </h3>

            <p style={{ margin: 0, fontSize: 14, color: 'var(--text-muted)' }}>
              Créez une équipe ou rejoignez une équipe existante avec un code.
            </p>

            <div style={{ marginTop: 18, display: 'flex', gap: 12, justifyContent: 'center' }}>
              <button
                onClick={() => setShowJoinModal(true)}
                style={secondaryButtonStyle}
              >
                Rejoindre une équipe
              </button>

              <Button icon={Plus} onClick={() => setShowCreateModal(true)}>
                Créer la première équipe
              </Button>
            </div>
          </div>
        ) : (
          <div style={teamsGridStyle}>
            {teams.map((team) => {
              const role = getCurrentUserRoleInTeam(team)
              const roleColors = getRoleBadgeColor(role || 'member')
              const isCreatedTeam = createdTeamId === team.id

              return (
                <div
                  key={team.id}
                  style={{
                    ...teamCardStyle,
                    border: isCreatedTeam
                      ? '1px solid rgba(16, 185, 129, 0.55)'
                      : '1px solid var(--border)',
                    boxShadow: isCreatedTeam
                      ? '0 16px 40px rgba(16,185,129,0.12)'
                      : 'none',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                    <div style={teamIconStyle}>
                      <Users size={22} color="#E07FA0" />
                    </div>

                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <h3 style={teamNameStyle}>{team.name}</h3>

                        {role && (
                          <span
                            style={{
                              fontSize: 11,
                              fontWeight: 800,
                              padding: '3px 8px',
                              borderRadius: 999,
                              color: roleColors.text,
                              background: roleColors.bg,
                            }}
                          >
                            {getRoleLabel(role)}
                          </span>
                        )}
                      </div>

                      <p style={teamDescStyle}>
                        {team.description || 'Aucune description'}
                      </p>
                    </div>
                  </div>

                  <div style={inviteCodeBoxStyle}>
                    <div style={sectionTinyTitleStyle}>Code d’invitation</div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                      <code style={inviteCodeStyle}>{team.invite_code}</code>

                      <button
                        onClick={() => copyInviteCode(team.invite_code, team.id)}
                        style={{
                          border: 'none',
                          background: 'transparent',
                          color: copiedId === team.id ? '#10b981' : 'var(--text-muted)',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                          fontWeight: 700,
                          fontSize: 12,
                        }}
                      >
                        {copiedId === team.id ? <Check size={15} /> : <Copy size={15} />}
                        {copiedId === team.id ? 'Copié' : 'Copier'}
                      </button>
                    </div>
                  </div>

                  <div style={membersBoxStyle}>
                    <div style={membersHeaderStyle}>
                      <span style={membersTitleStyle}>
                        Membres ({team.members?.length || 0})
                      </span>

                      <button
                        onClick={() => {
                          setSelectedTeam(team)
                          setShowMembersModal(true)
                        }}
                        style={linkButtonStyle}
                      >
                        Voir tous
                      </button>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {team.members?.slice(0, 3).map((member) => (
                        <div key={member.id || member.user_id} style={memberRowStyle}>
                          <div style={avatarStyle}>
                            {member.name?.charAt(0)?.toUpperCase() || '?'}
                          </div>
                          <span>{member.name}</span>
                          <span style={{ opacity: 0.6 }}>•</span>
                          <span>{getRoleLabel(member.role)}</span>
                        </div>
                      ))}

                      {(!team.members || team.members.length === 0) && (
                        <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                          Aucun membre chargé
                        </span>
                      )}
                    </div>
                  </div>

                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: canManageTeam(team) ? '1fr 1fr' : '1fr',
                      gap: 10,
                    }}
                  >
                    <button
                      onClick={() => navigate(`/projects?create=true&teamId=${team.id}`)}
                      style={actionButtonStyle}
                    >
                      <FolderPlus size={15} />
                      Créer projet
                    </button>

                    {canManageTeam(team) && (
                      <button
                        onClick={() => {
                          setSelectedTeam(team)
                          setShowInviteModal(true)
                        }}
                        style={actionButtonStyle}
                      >
                        <Mail size={15} />
                        Inviter
                      </button>
                    )}
                  </div>

                  {canManageTeam(team) && (
                    <button
                      onClick={() => handleDeleteTeam(team.id)}
                      style={deleteButtonStyle}
                    >
                      <Trash2 size={15} />
                      Supprimer équipe
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      <Modal
        open={showJoinModal}
        onClose={() => setShowJoinModal(false)}
        title="Rejoindre une équipe"
      >
        <div style={{ display: 'grid', gap: 16 }}>
          <div>
            <label style={labelStyle}>Code d’équipe</label>
            <Input
              value={joinCode}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setJoinCode(e.target.value)
              }
              placeholder="Ex: TEAM-XXXX-XXXX"
            />

            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>
              Entrez le code partagé par le propriétaire de l’équipe. Une demande sera envoyée pour validation.
            </p>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
            <button
              type="button"
              onClick={() => setShowJoinModal(false)}
              style={secondaryButtonStyle}
            >
              Annuler
            </button>

            <button
              type="button"
              onClick={handleJoinTeam}
              disabled={joinLoading}
              style={{
                ...primaryButtonStyle,
                opacity: joinLoading ? 0.7 : 1,
                cursor: joinLoading ? 'not-allowed' : 'pointer',
              }}
            >
              {joinLoading ? 'Envoi...' : 'Envoyer la demande'}
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Créer une équipe"
      >
        <div style={{ display: 'grid', gap: 16 }}>
          <div>
            <label style={labelStyle}>Nom de l’équipe</label>
            <Input
              value={formData.name}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setFormData({ ...formData, name: e.target.value })
              }
              placeholder="Ex: Backend Team"
            />
          </div>

          <div>
            <label style={labelStyle}>Description</label>
            <Input
              value={formData.description}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setFormData({ ...formData, description: e.target.value })
              }
              placeholder="Description optionnelle"
            />
          </div>

          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={() => setShowCreateModal(false)}
              style={secondaryButtonStyle}
            >
              Annuler
            </button>

            <button
              type="button"
              onClick={handleCreateTeam}
              style={primaryButtonStyle}
            >
              Créer
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        open={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        title={`Inviter un membre${selectedTeam ? ` — ${selectedTeam.name}` : ''}`}
      >
        <div style={{ display: 'grid', gap: 16 }}>
          <div>
            <label style={labelStyle}>Email du membre</label>
            <Input
              value={memberEmail}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setMemberEmail(e.target.value)
              }
              placeholder="dev@company.com"
            />
          </div>

          <div>
            <label style={labelStyle}>Rôle</label>
            <select
              value={memberRole}
              onChange={(e) => setMemberRole(e.target.value as 'admin' | 'member')}
              style={selectStyle}
            >
              <option value="member">Membre</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={() => setShowInviteModal(false)}
              style={secondaryButtonStyle}
            >
              Annuler
            </button>

            <button
              type="button"
              onClick={handleInviteMember}
              disabled={invitationLoading}
              style={{
                ...primaryButtonStyle,
                opacity: invitationLoading ? 0.7 : 1,
                cursor: invitationLoading ? 'not-allowed' : 'pointer',
              }}
            >
              {invitationLoading ? 'Envoi...' : 'Envoyer invitation'}
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        open={showMembersModal}
        onClose={() => setShowMembersModal(false)}
        title={`Membres${selectedTeam ? ` — ${selectedTeam.name}` : ''}`}
      >
        <div style={{ display: 'grid', gap: 12 }}>
          {selectedTeam?.members?.length ? (
            selectedTeam.members.map((member) => {
              const colors = getRoleBadgeColor(member.role)
              const memberId = member.id || member.user_id || ''

              return (
                <div key={memberId} style={memberModalRowStyle}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={modalAvatarStyle}>
                      {member.name?.charAt(0)?.toUpperCase() || '?'}
                    </div>

                    <div>
                      <div style={modalMemberNameStyle}>{member.name}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                        {member.email}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 800,
                        padding: '4px 8px',
                        borderRadius: 999,
                        color: colors.text,
                        background: colors.bg,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                      }}
                    >
                      <Shield size={12} />
                      {getRoleLabel(member.role)}
                    </span>

                    {selectedTeam &&
                      canManageTeam(selectedTeam) &&
                      member.role !== 'owner' && (
                        <button
                          onClick={() => handleRemoveMember(memberId)}
                          style={removeMemberButtonStyle}
                        >
                          <X size={16} />
                        </button>
                      )}
                  </div>
                </div>
              )
            })
          ) : (
            <p style={{ color: 'var(--text-muted)' }}>Aucun membre trouvé.</p>
          )}
        </div>
      </Modal>
    </Layout>
  )
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  marginBottom: 8,
  fontSize: 13,
  fontWeight: 700,
  color: 'var(--text-primary)',
}

const selectStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  borderRadius: 8,
  border: '1px solid var(--border)',
  background: 'var(--input-bg)',
  color: 'var(--text-primary)',
  fontSize: 14,
  outline: 'none',
}

const primaryButtonStyle: React.CSSProperties = {
  padding: '10px 16px',
  borderRadius: 10,
  border: 'none',
  background: '#E07FA0',
  color: '#fff',
  cursor: 'pointer',
  fontWeight: 800,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 6,
}

const secondaryButtonStyle: React.CSSProperties = {
  padding: '10px 16px',
  borderRadius: 10,
  border: '1px solid var(--border)',
  background: 'var(--bg-card)',
  color: 'var(--text-primary)',
  cursor: 'pointer',
  fontWeight: 700,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 6,
}

const dangerLightButtonStyle: React.CSSProperties = {
  padding: '10px 16px',
  borderRadius: 10,
  border: '1px solid rgba(239,68,68,0.25)',
  background: 'rgba(239,68,68,0.08)',
  color: '#ef4444',
  cursor: 'pointer',
  fontWeight: 800,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 6,
}

const actionButtonStyle: React.CSSProperties = {
  border: '1px solid var(--border)',
  background: 'var(--bg-card)',
  color: 'var(--text-primary)',
  borderRadius: 10,
  padding: '10px 12px',
  cursor: 'pointer',
  fontWeight: 800,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 6,
}

const successBannerStyle: React.CSSProperties = {
  marginBottom: 24,
  padding: '18px 20px',
  borderRadius: 14,
  border: '1px solid rgba(16, 185, 129, 0.35)',
  background: 'rgba(16, 185, 129, 0.08)',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: 16,
}

const bannerTitleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: 15,
  color: 'var(--text-primary)',
  fontWeight: 800,
}

const bannerTextStyle: React.CSSProperties = {
  margin: '4px 0 0',
  color: 'var(--text-muted)',
  fontSize: 13,
}

const joinRequestsBoxStyle: React.CSSProperties = {
  marginBottom: 24,
  padding: 20,
  borderRadius: 16,
  border: '1px solid var(--border)',
  background: 'var(--bg-card)',
}

const joinRequestRowStyle: React.CSSProperties = {
  padding: 14,
  borderRadius: 12,
  background: 'var(--input-bg)',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: 16,
}

const emptyStateStyle: React.CSSProperties = {
  textAlign: 'center',
  padding: '60px 20px',
  border: '1px dashed var(--border)',
  borderRadius: 16,
  background: 'var(--bg-card)',
}

const teamsGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))',
  gap: 20,
}

const teamCardStyle: React.CSSProperties = {
  background: 'var(--bg-card)',
  borderRadius: 16,
  padding: 20,
  display: 'flex',
  flexDirection: 'column',
  gap: 16,
}

const teamIconStyle: React.CSSProperties = {
  width: 42,
  height: 42,
  borderRadius: 12,
  background: 'rgba(217, 70, 239, 0.12)',
  display: 'grid',
  placeItems: 'center',
  flexShrink: 0,
}

const teamNameStyle: React.CSSProperties = {
  margin: 0,
  fontSize: 17,
  fontWeight: 800,
  color: 'var(--text-primary)',
}

const teamDescStyle: React.CSSProperties = {
  margin: 0,
  fontSize: 13,
  color: 'var(--text-muted)',
  lineHeight: 1.5,
}

const inviteCodeBoxStyle: React.CSSProperties = {
  padding: 12,
  borderRadius: 12,
  background: 'var(--input-bg)',
  border: '1px solid var(--border)',
}

const sectionTinyTitleStyle: React.CSSProperties = {
  fontSize: 11,
  color: 'var(--text-muted)',
  fontWeight: 700,
  marginBottom: 8,
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
}

const inviteCodeStyle: React.CSSProperties = {
  fontSize: 13,
  color: 'var(--text-primary)',
  fontFamily: 'monospace',
  fontWeight: 800,
}

const membersBoxStyle: React.CSSProperties = {
  padding: 12,
  borderRadius: 12,
  background: 'var(--input-bg)',
}

const membersHeaderStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: 10,
}

const membersTitleStyle: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 800,
  color: 'var(--text-primary)',
}

const linkButtonStyle: React.CSSProperties = {
  border: 'none',
  background: 'transparent',
  color: '#E07FA0',
  cursor: 'pointer',
  fontWeight: 700,
  fontSize: 12,
}

const memberRowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  fontSize: 12,
  color: 'var(--text-muted)',
}

const avatarStyle: React.CSSProperties = {
  width: 24,
  height: 24,
  borderRadius: 999,
  background: '#E07FA0',
  color: '#fff',
  display: 'grid',
  placeItems: 'center',
  fontSize: 11,
  fontWeight: 800,
}

const deleteButtonStyle: React.CSSProperties = {
  border: '1px solid rgba(239,68,68,0.25)',
  background: 'rgba(239,68,68,0.08)',
  color: '#ef4444',
  borderRadius: 10,
  padding: '9px 12px',
  cursor: 'pointer',
  fontWeight: 700,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 6,
}

const memberModalRowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: 12,
  border: '1px solid var(--border)',
  borderRadius: 12,
  background: 'var(--input-bg)',
}

const modalAvatarStyle: React.CSSProperties = {
  width: 34,
  height: 34,
  borderRadius: 999,
  background: '#E07FA0',
  color: '#fff',
  display: 'grid',
  placeItems: 'center',
  fontWeight: 800,
}

const modalMemberNameStyle: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 800,
  color: 'var(--text-primary)',
}

const removeMemberButtonStyle: React.CSSProperties = {
  border: 'none',
  background: 'transparent',
  color: '#ef4444',
  cursor: 'pointer',
}