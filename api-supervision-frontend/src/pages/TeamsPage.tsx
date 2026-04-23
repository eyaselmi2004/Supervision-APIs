import React, { useEffect, useState } from 'react'
import { Plus, Trash2, Users, Copy, Check, Mail, Shield, X } from 'lucide-react'
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

export const TeamsPage: React.FC = () => {
  const { isAdmin, user } = useAuth()
  const [teams, setTeams] = useState<Team[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [showMembersModal, setShowMembersModal] = useState(false)
  const [showAddMemberModal, setShowAddMemberModal] = useState(false)
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [formData, setFormData] = useState({ name: '', description: '' })
  const [memberEmail, setMemberEmail] = useState('')
  const [memberRole, setMemberRole] = useState<'admin' | 'member'>('member')
  const [invitationLoading, setInvitationLoading] = useState(false)

  useEffect(() => {
    loadTeams()
  }, [])

  const loadTeams = async () => {
    setLoading(true)
    try {
      const data = await teamsService.getAll()
      
      // Charger les membres pour chaque team
      const teamsWithMembers = await Promise.all(
        data.map(async (team) => {
          try {
            const members = await teamsService.getMembers(team.id as UUID)
            return {
              ...team,
              members: members.map(m => ({
                ...m,
                id: m.user_id,
              })),
              member_count: members.length,
            }
          } catch (e) {
            console.error(`Erreur chargement membres de ${team.id}:`, e)
            return { ...team, members: [] }
          }
        })
      )
      
      setTeams(teamsWithMembers)
    } catch (e) {
      console.error('Erreur chargement équipes:', e)
      // Fallback: données mockées si l'API ne fonctionne pas
      setTeams([])
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async () => {
    if (!formData.name) return
    try {
      setLoading(true)
      await teamsService.create({
        name: formData.name,
        description: formData.description,
      })
      setFormData({ name: '', description: '' })
      setShowModal(false)
      await loadTeams()
    } catch (e: any) {
      console.error('Erreur création équipe:', e)
      alert(`Erreur: ${e.response?.data?.detail || e.message}`)
    } finally {
      setLoading(false)
    }
  }

  const handleAddMember = async () => {
    if (!memberEmail.trim() || !selectedTeam) return
    try {
      setInvitationLoading(true)
      console.log(`📧 Envoi invitation à ${memberEmail} pour team ${selectedTeam.id}...`)
      
      const result = await teamsService.inviteUser(
        selectedTeam.id as UUID,
        memberEmail,
        memberRole
      )
      
      console.log('✅ Réponse API:', result)
      alert(result.message || 'Invitation envoyée !')
      
      setMemberEmail('')
      setMemberRole('member')
      setShowAddMemberModal(false)
    } catch (e: any) {
      console.error('❌ Erreur ajout membre:', e)
      alert(`Erreur: ${e.response?.data?.detail || e.message}`)
    } finally {
      setInvitationLoading(false)
    }
  }

  const handleRemoveMember = async (memberId: string) => {
    if (!confirm('Supprimer ce membre ?')) return
    try {
      if (selectedTeam) {
        await teamsService.removeMember(selectedTeam.id as UUID, memberId as UUID)
        setSelectedTeam({
          ...selectedTeam,
          members: selectedTeam.members.filter(m => (m.id || m.user_id) !== memberId),
        })
      }
    } catch (e: any) {
      console.error('Erreur suppression membre:', e)
      alert(`Erreur: ${e.response?.data?.detail || e.message}`)
    }
  }

  const handleDeleteTeam = async (id: string) => {
    if (!confirm('Supprimer cette équipe ?')) return
    try {
      setLoading(true)
      await teamsService.delete(id as UUID)
      await loadTeams()
    } catch (e: any) {
      console.error('Erreur suppression:', e)
      alert(`Erreur: ${e.response?.data?.detail || e.message}`)
    } finally {
      setLoading(false)
    }
  }

  const copyInviteCode = (code: string, id: string) => {
    navigator.clipboard.writeText(code)
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
        return { bg: 'rgba(217, 70, 239, 0.1)', text: '#d946ef' }
      case 'admin':
        return { bg: 'rgba(192, 38, 211, 0.1)', text: '#c026d3' }
      case 'member':
        return { bg: 'rgba(107, 114, 128, 0.1)', text: '#6b7280' }
      default:
        return { bg: 'transparent', text: '#6b7280' }
    }
  }

  if (!isAdmin) {
    return (
      <Layout>
        <div style={{ padding: '40px', textAlign: 'center' }}>
          <p style={{ color: 'var(--text-muted)' }}>Accès réservé aux administrateurs</p>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <Header
        title="Équipes"
        subtitle="Créez et gérez les équipes de votre plateforme"
        actions={<Button icon={Plus} onClick={() => setShowModal(true)}>Créer une équipe</Button>}
      />

      <div style={{ padding: '28px 32px' }}>
        {loading ? (
          <p style={{ color: 'var(--text-muted)' }}>Chargement...</p>
        ) : teams.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <p style={{ fontSize: '16px', color: 'var(--text-subtle)' }}>Aucune équipe</p>
            <Button icon={Plus} onClick={() => setShowModal(true)} style={{ marginTop: '16px' }}>
              Créer la première équipe
            </Button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '20px' }}>
            {teams.map(team => (
              <div
                key={team.id}
                style={{
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border)',
                  borderRadius: '12px',
                  padding: '20px',
                  transition: 'all 0.2s',
                  display: 'flex',
                  flexDirection: 'column',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-4px)'
                  e.currentTarget.style.boxShadow = '0 12px 32px rgba(0,0,0,0.12)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)'
                  e.currentTarget.style.boxShadow = 'none'
                }}
              >
                {/* ── Header ── */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                  <Users size={24} color="#d946ef" />
                  <div style={{ flex: 1 }}>
                    <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>
                      {team.name}
                    </h3>
                    {team.description && (
                      <p style={{ margin: '2px 0 0', fontSize: '11px', color: 'var(--text-muted)' }}>
                        {team.description}
                      </p>
                    )}
                  </div>
                </div>

                {/* ── Code d'invitation ── */}
                <div style={{
                  background: 'var(--input-bg)',
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                  padding: '8px 12px',
                  marginBottom: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}>
                  <code style={{ fontSize: '12px', color: 'var(--text-primary)', fontFamily: 'monospace' }}>
                    {team.invite_code}
                  </code>
                  <button
                    onClick={() => copyInviteCode(team.invite_code, team.id)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      color: 'var(--text-muted)',
                      transition: 'all 0.15s',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = '#d946ef'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = 'var(--text-muted)'
                    }}
                  >
                    {copiedId === team.id ? <Check size={14} /> : <Copy size={14} />}
                  </button>
                </div>

                {/* ── Membres ── */}
                <div style={{
                  background: 'var(--input-bg)',
                  borderRadius: '8px',
                  padding: '12px',
                  marginBottom: '16px',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <p style={{ margin: 0, fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>
                      Membres ({team.members?.length || 0})
                    </p>
                    <button
                      onClick={() => {
                        setSelectedTeam(team)
                        setShowMembersModal(true)
                      }}
                      style={{
                        fontSize: '11px', color: '#d946ef', background: 'transparent',
                        border: 'none', cursor: 'pointer', textDecoration: 'underline',
                        fontFamily: 'Sora, sans-serif',
                      }}
                    >
                      Voir tous
                    </button>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {team.members?.slice(0, 2).map(member => (
                      <div key={member.id || member.user_id} style={{
                        display: 'flex', alignItems: 'center', gap: '8px',
                        padding: '6px 0', fontSize: '11px', color: 'var(--text-muted)',
                      }}>
                        <div style={{
                          width: '20px', height: '20px', borderRadius: '50%',
                          background: '#d946ef', display: 'flex', alignItems: 'center',
                          justifyContent: 'center', color: 'white', fontSize: '10px', fontWeight: 700,
                        }}>
                          {member.name.charAt(0)}
                        </div>
                        <span>{member.name}</span>
                      </div>
                    ))}
                    {team.members && team.members.length > 2 && (
                      <p style={{ margin: '6px 0 0', fontSize: '11px', color: 'var(--text-subtle)' }}>
                        +{team.members.length - 2} autre{team.members.length - 2 > 1 ? 's' : ''}
                      </p>
                    )}
                  </div>
                </div>

                {/* ── Actions ── */}
                <div style={{ display: 'flex', gap: '8px', marginTop: 'auto' }}>
                  <button
                    onClick={() => {
                      setSelectedTeam(team)
                      setShowAddMemberModal(true)
                    }}
                    style={{
                      flex: 1, padding: '8px 12px',
                      background: 'rgba(217, 70, 239, 0.1)', border: '1px solid #d946ef',
                      borderRadius: '6px', color: '#d946ef',
                      fontSize: '12px', fontWeight: 500, cursor: 'pointer',
                      transition: 'all 0.15s', fontFamily: 'Sora, sans-serif',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(14, 165, 233, 0.2)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'rgba(14, 165, 233, 0.1)'
                    }}
                  >
                    <Mail size={12} style={{ display: 'inline', marginRight: '4px' }} />
                    Inviter
                  </button>
                  <button
                    onClick={() => handleDeleteTeam(team.id)}
                    style={{
                      padding: '8px 12px', background: 'transparent',
                      border: '1px solid var(--border)', borderRadius: '6px',
                      color: 'var(--text-subtle)', cursor: 'pointer',
                      transition: 'all 0.15s', fontFamily: 'Sora, sans-serif',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = '#ef4444'
                      e.currentTarget.style.borderColor = '#ef4444'
                      e.currentTarget.style.background = 'rgba(239,68,68,0.05)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = 'var(--text-subtle)'
                      e.currentTarget.style.borderColor = 'var(--border)'
                      e.currentTarget.style.background = 'transparent'
                    }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Modal créer équipe ── */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title="Créer une équipe" size="md">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <Input
            label="Nom de l'équipe"
            value={formData.name}
            onChange={e => setFormData({ ...formData, name: e.target.value })}
            placeholder="Ex: Équipe Frontend"
          />
          <Input
            label="Description"
            value={formData.description}
            onChange={e => setFormData({ ...formData, description: e.target.value })}
            placeholder="Description optionnelle"
          />
          <div style={{ display: 'flex', gap: '12px', paddingTop: '8px' }}>
            <Button variant="secondary" onClick={() => setShowModal(false)} style={{ flex: 1 }}>Annuler</Button>
            <Button onClick={handleCreate} disabled={!formData.name} style={{ flex: 1 }}>Créer</Button>
          </div>
        </div>
      </Modal>

      {/* ── Modal voir/gérer membres ── */}
      <Modal open={showMembersModal} onClose={() => setShowMembersModal(false)} title={`Membres - ${selectedTeam?.name}`} size="lg">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {selectedTeam && selectedTeam.members && selectedTeam.members.length > 0 ? (
            <div>
              <table style={{
                width: '100%', borderCollapse: 'collapse',
                fontSize: '13px',
              }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    <th style={{ padding: '12px 0', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 600 }}>Nom</th>
                    <th style={{ padding: '12px 0', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 600 }}>Email</th>
                    <th style={{ padding: '12px 0', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 600 }}>Rôle</th>
                    <th style={{ padding: '12px 0', textAlign: 'right', color: 'var(--text-muted)', fontWeight: 600 }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedTeam.members.map(member => (
                    <tr key={member.id || member.user_id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '12px 0', color: 'var(--text-primary)' }}>{member.name}</td>
                      <td style={{ padding: '12px 0', color: 'var(--text-muted)' }}>{member.email}</td>
                      <td style={{ padding: '12px 0' }}>
                        <span style={{
                          padding: '4px 8px', borderRadius: '4px',
                          fontSize: '11px', fontWeight: 600,
                          background: getRoleBadgeColor(member.role).bg,
                          color: getRoleBadgeColor(member.role).text,
                        }}>
                          {getRoleLabel(member.role)}
                        </span>
                      </td>
                      <td style={{ padding: '12px 0', textAlign: 'right' }}>
                        {member.role !== 'owner' && (
                          <button
                            onClick={() => handleRemoveMember(member.id || member.user_id)}
                            style={{
                              background: 'transparent', border: 'none',
                              cursor: 'pointer', color: 'var(--text-muted)',
                              transition: 'all 0.15s',
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.color = '#ef4444'
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.color = 'var(--text-muted)'
                            }}
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p style={{ color: 'var(--text-muted)', textAlign: 'center' }}>Aucun membre</p>
          )}
          <Button variant="secondary" onClick={() => setShowMembersModal(false)} style={{ alignSelf: 'flex-end' }}>Fermer</Button>
        </div>
      </Modal>

      {/* ── Modal ajouter membre ── */}
      <Modal open={showAddMemberModal} onClose={() => setShowAddMemberModal(false)} title="Inviter un utilisateur" size="md">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <Input
            label="Email de l'utilisateur"
            type="email"
            value={memberEmail}
            onChange={e => setMemberEmail(e.target.value)}
            placeholder="Ex: user@example.com"
          />
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px' }}>
              Rôle
            </label>
            <select
              value={memberRole}
              onChange={e => setMemberRole(e.target.value as 'admin' | 'member')}
              style={{
                width: '100%', padding: '8px 12px',
                background: 'var(--input-bg)', border: '1px solid var(--border)',
                borderRadius: '8px', color: 'var(--text-primary)',
                fontSize: '13px', fontFamily: 'Sora, sans-serif', outline: 'none',
              }}
            >
              <option value="member">Membre</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-muted)' }}>
            Une invitation sera envoyée à cet email pour rejoindre l'équipe.
          </p>
          <div style={{ display: 'flex', gap: '12px', paddingTop: '8px' }}>
            <Button variant="secondary" onClick={() => setShowAddMemberModal(false)} style={{ flex: 1 }}>Annuler</Button>
            <Button 
              onClick={handleAddMember} 
              disabled={!memberEmail.trim() || invitationLoading} 
              style={{ flex: 1 }}
            >
              {invitationLoading ? 'Envoi...' : 'Inviter'}
            </Button>
          </div>
        </div>
      </Modal>
    </Layout>
  )
}
