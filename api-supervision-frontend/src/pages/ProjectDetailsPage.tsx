import React, { useEffect, useMemo, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Globe,
  LayoutDashboard,
  Plus,
  Shield,
  Trash2,
  Users,
} from 'lucide-react'
import { Layout } from '../components/layout/Layout'
import { Header } from '../components/layout/Header'
import api from '../services/api'
import { useProject } from '../contexts/ProjectContext'

interface Project {
  id: string
  name: string
  description?: string
  icon_key?: string
  color?: string
  owner_id?: string
  team_id?: string | null
  is_active?: boolean
  created_at?: string
  updated_at?: string
}

interface Team {
  id: string
  name: string
  description?: string
  invite_code?: string
  owner_id?: string
  is_active?: boolean
  created_at?: string
  updated_at?: string
}

interface ApiService {
  id: string
  name: string
  base_url: string
  is_active?: boolean
  created_at?: string
  project_id?: string | null
}

const formatDate = (value?: string) => {
  if (!value) return 'Non renseignée'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Non renseignée'

  return date.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export const ProjectDetailsPage: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>()
  const navigate = useNavigate()
  const { setSelectedProject } = useProject()

  const [project, setProject] = useState<Project | null>(null)
  const [teams, setTeams] = useState<Team[]>([])
  const [allApis, setAllApis] = useState<ApiService[]>([])
  const [projectApis, setProjectApis] = useState<ApiService[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    if (projectId) loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId])

  const loadData = async () => {
    setLoading(true)
    setMessage(null)

    try {
      const [projectRes, allApisRes, projectApisRes, teamsRes] = await Promise.all([
        api.get(`/projects/${projectId}`),
        api.get('/api-services'),
        api.get(`/api-services?project_id=${projectId}`),
        api.get('/teams').catch(() => ({ data: [] })),
      ])

      setProject(projectRes.data)
      setAllApis(Array.isArray(allApisRes.data) ? allApisRes.data : [])
      setProjectApis(Array.isArray(projectApisRes.data) ? projectApisRes.data : [])
      setTeams(Array.isArray(teamsRes.data) ? teamsRes.data : [])
    } catch (e) {
      console.error('❌ Erreur chargement projet:', e)
      setMessage('Impossible de charger les détails du projet.')
    } finally {
      setLoading(false)
    }
  }

  const assignApiToProject = async (apiId: string) => {
    if (!projectId) return

    setActionLoading(apiId)
    setMessage(null)

    try {
      await api.put(`/api-services/${apiId}`, { project_id: projectId })
      setMessage('API assignée au projet avec succès.')
      await loadData()
    } catch (e) {
      console.error('❌ Erreur assignation:', e)
      setMessage("Impossible d'assigner cette API au projet.")
    } finally {
      setActionLoading(null)
    }
  }

  const removeApiFromProject = async (apiId: string) => {
    setActionLoading(apiId)
    setMessage(null)

    try {
      await api.put(`/api-services/${apiId}`, { project_id: null })
      setMessage('API retirée du projet avec succès.')
      await loadData()
    } catch (e) {
      console.error('❌ Erreur retrait:', e)
      setMessage('Impossible de retirer cette API du projet.')
    } finally {
      setActionLoading(null)
    }
  }

  const openProjectDashboard = () => {
    if (project) setSelectedProject(project as any)
    navigate('/dashboard')
  }

  const team = useMemo(
    () => teams.find((item) => item.id === project?.team_id) ?? null,
    [teams, project?.team_id],
  )

  const unassignedApis = useMemo(
    () => allApis.filter((apiItem) => !apiItem.project_id || apiItem.project_id !== projectId),
    [allApis, projectId],
  )

  const activeApisCount = projectApis.filter((apiItem) => apiItem.is_active !== false).length

  return (
    <Layout>
      <Header
        title={project?.name || 'Détail projet'}
        subtitle="Vue projet, équipe et affectation des APIs"
        actions={(
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={openProjectDashboard} style={primaryButtonStyle}>
              <LayoutDashboard size={14} /> Ouvrir dashboard
            </button>
            <button onClick={() => navigate('/projects')} style={secondaryButtonStyle}>
              <ArrowLeft size={14} /> Retour
            </button>
          </div>
        )}
      />

      <div style={{ padding: '28px 32px' }}>
        {loading ? (
          <div style={emptyStateStyle}>Chargement du projet...</div>
        ) : !project ? (
          <div style={emptyStateStyle}>Projet introuvable.</div>
        ) : (
          <>
            {message && <div style={messageBoxStyle}>{message}</div>}

            <section style={heroCardStyle}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 20 }}>
                <div>
                  <div style={sectionTagStyle}>Project overview</div>
                  <h2 style={{ margin: '12px 0 8px', fontSize: 30, lineHeight: 1.15, color: 'var(--text-primary)' }}>
                    {project.name}
                  </h2>
                  <p style={{ margin: 0, maxWidth: 760, color: 'var(--text-muted)', lineHeight: 1.7 }}>
                    {project.description || 'Aucune description renseignée pour ce projet.'}
                  </p>
                </div>

                <div style={statusPillStyle}>
                  <span style={{ width: 8, height: 8, borderRadius: 999, background: '#10b981' }} />
                  {project.is_active === false ? 'Inactive' : 'Active'}
                </div>
              </div>

              <div style={statsGridStyle}>
                <StatBox icon={Globe} label="APIs assignées" value={projectApis.length} helper={`${activeApisCount} active(s)`} />
                <StatBox icon={Users} label="Équipe" value={team?.name || 'Aucune'} helper="Accès projet" />
                <StatBox icon={Shield} label="Santé" value="100%" helper="État estimé" success />
                <StatBox icon={Activity} label="Créé le" value={formatDate(project.created_at)} helper="Projet Traceon" />
              </div>
            </section>

            <section style={quickActionsStyle}>
              <button onClick={openProjectDashboard} style={quickActionButtonStyle}>
                <LayoutDashboard size={16} /> Dashboard du projet
              </button>
              <button onClick={() => navigate('/metrics')} style={quickActionButtonStyle}>
                <Activity size={16} /> Voir métriques
              </button>
              <button onClick={() => navigate('/alerts')} style={quickActionButtonStyle}>
                <AlertTriangle size={16} /> Voir alertes
              </button>
              <button onClick={() => navigate('/incidents')} style={quickActionButtonStyle}>
                <Shield size={16} /> Voir incidents
              </button>
            </section>

            <div style={twoColumnsStyle}>
              <section style={panelStyle}>
                <div style={panelHeaderStyle}>
                  <div>
                    <h3 style={panelTitleStyle}>Équipe affectée</h3>
                    <p style={panelSubtitleStyle}>L’équipe détermine les utilisateurs qui peuvent accéder au projet.</p>
                  </div>
                  <Users size={18} color="var(--pink)" />
                </div>

                {team ? (
                  <div style={teamCardStyle}>
                    <div style={avatarStyle}>{team.name.slice(0, 2).toUpperCase()}</div>
                    <div>
                      <p style={{ margin: 0, color: 'var(--text-primary)', fontWeight: 800 }}>{team.name}</p>
                      <p style={{ margin: '3px 0 0', color: 'var(--text-muted)', fontSize: 13 }}>
                        {team.description || 'Équipe liée au projet'}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div style={emptyInlineStyle}>Aucune équipe n’est encore affectée à ce projet.</div>
                )}
              </section>

              <section style={panelStyle}>
                <div style={panelHeaderStyle}>
                  <div>
                    <h3 style={panelTitleStyle}>Informations projet</h3>
                    <p style={panelSubtitleStyle}>Résumé fonctionnel et technique du projet.</p>
                  </div>
                  <CheckCircle2 size={18} color="#10b981" />
                </div>

                <div style={infoGridStyle}>
                  <InfoRow label="Type" value={project.icon_key || 'Projet'} />
                  <InfoRow label="Date création" value={formatDate(project.created_at)} />
                  <InfoRow label="Dernière mise à jour" value={formatDate(project.updated_at)} />
                  <InfoRow label="Identifiant" value={project.id} mono />
                </div>
              </section>
            </div>

            <section style={panelStyle}>
              <div style={panelHeaderStyle}>
                <div>
                  <h3 style={panelTitleStyle}>APIs du projet ({projectApis.length})</h3>
                  <p style={panelSubtitleStyle}>Ces APIs sont utilisées dans le dashboard, les métriques, les alertes et les incidents du projet.</p>
                </div>
                <Globe size={18} color="var(--pink)" />
              </div>

              {projectApis.length === 0 ? (
                <div style={emptyInlineStyle}>Aucune API assignée. Ajoutez une API depuis la liste disponible ci-dessous.</div>
              ) : (
                <div style={apiListStyle}>
                  {projectApis.map((apiItem) => (
                    <ApiRow
                      key={apiItem.id}
                      apiItem={apiItem}
                      actionLabel="Retirer"
                      actionIcon={<Trash2 size={13} />}
                      danger
                      loading={actionLoading === apiItem.id}
                      onClick={() => removeApiFromProject(apiItem.id)}
                    />
                  ))}
                </div>
              )}
            </section>

            <section style={panelStyle}>
              <div style={panelHeaderStyle}>
                <div>
                  <h3 style={panelTitleStyle}>APIs disponibles ({unassignedApis.length})</h3>
                  <p style={panelSubtitleStyle}>Ajoutez ici les APIs non affectées ou appartenant à un autre projet.</p>
                </div>
                <Plus size={18} color="var(--pink)" />
              </div>

              {unassignedApis.length === 0 ? (
                <div style={emptyInlineStyle}>Toutes les APIs sont déjà assignées.</div>
              ) : (
                <div style={apiListStyle}>
                  {unassignedApis.map((apiItem) => (
                    <ApiRow
                      key={apiItem.id}
                      apiItem={apiItem}
                      actionLabel="Ajouter"
                      actionIcon={<Plus size={13} />}
                      loading={actionLoading === apiItem.id}
                      onClick={() => assignApiToProject(apiItem.id)}
                    />
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </Layout>
  )
}

const StatBox = ({ icon: Icon, label, value, helper, success }: any) => (
  <div style={statBoxStyle}>
    <div style={statIconStyle}><Icon size={16} /></div>
    <div>
      <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em' }}>{label}</p>
      <p style={{ margin: '5px 0 0', color: success ? '#10b981' : 'var(--text-primary)', fontSize: 22, fontWeight: 900 }}>{value}</p>
      <p style={{ margin: '2px 0 0', color: 'var(--text-subtle)', fontSize: 12 }}>{helper}</p>
    </div>
  </div>
)

const InfoRow = ({ label, value, mono }: { label: string; value: string; mono?: boolean }) => (
  <div style={infoRowStyle}>
    <span>{label}</span>
    <strong style={{ fontFamily: mono ? 'monospace' : 'inherit' }}>{value}</strong>
  </div>
)

const ApiRow = ({ apiItem, actionLabel, actionIcon, danger, loading, onClick }: any) => (
  <div style={apiRowStyle}>
    <div style={{ minWidth: 0 }}>
      <p style={{ margin: 0, color: 'var(--text-primary)', fontWeight: 800 }}>{apiItem.name}</p>
      <p style={{ margin: '4px 0 0', color: 'var(--text-muted)', fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {apiItem.base_url}
      </p>
    </div>

    <button
      onClick={onClick}
      disabled={loading}
      style={{
        ...apiButtonStyle,
        color: danger ? '#ef4444' : '#10b981',
        borderColor: danger ? 'rgba(239,68,68,.25)' : 'rgba(16,185,129,.25)',
        background: danger ? 'rgba(239,68,68,.08)' : 'rgba(16,185,129,.08)',
        opacity: loading ? .65 : 1,
      }}
    >
      {actionIcon} {loading ? '...' : actionLabel}
    </button>
  </div>
)

const primaryButtonStyle: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 8, padding: '9px 14px', borderRadius: 10,
  border: '1px solid var(--pink-mid)', background: 'var(--pink-bg)', color: 'var(--pink)',
  fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit',
}

const secondaryButtonStyle: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 8, padding: '9px 14px', borderRadius: 10,
  border: '1px solid var(--border)', background: 'var(--background-card)', color: 'var(--text-muted)',
  fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
}

const heroCardStyle: React.CSSProperties = {
  background: 'var(--background-card)', border: '1px solid var(--border)', borderRadius: 18,
  padding: 24, marginBottom: 18,
}

const sectionTagStyle: React.CSSProperties = {
  display: 'inline-flex', border: '1px solid var(--border)', borderRadius: 999, padding: '4px 10px',
  color: 'var(--pink)', background: 'var(--pink-bg)', fontSize: 11, fontWeight: 900,
  textTransform: 'uppercase', letterSpacing: '.1em',
}

const statusPillStyle: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 8, border: '1px solid rgba(16,185,129,.25)',
  color: '#10b981', background: 'rgba(16,185,129,.08)', borderRadius: 999, padding: '7px 11px',
  fontSize: 12, fontWeight: 800,
}

const statsGridStyle: React.CSSProperties = {
  display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 14, marginTop: 22,
}

const statBoxStyle: React.CSSProperties = {
  display: 'flex', gap: 12, alignItems: 'flex-start', background: 'var(--bg-secondary)',
  border: '1px solid var(--border)', borderRadius: 14, padding: 16,
}

const statIconStyle: React.CSSProperties = {
  width: 34, height: 34, borderRadius: 10, display: 'grid', placeItems: 'center',
  color: 'var(--pink)', background: 'var(--pink-bg)', border: '1px solid rgba(224,127,160,.22)',
}

const quickActionsStyle: React.CSSProperties = {
  display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 12, marginBottom: 18,
}

const quickActionButtonStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '12px 14px',
  background: 'var(--background-card)', border: '1px solid var(--border)', borderRadius: 12,
  color: 'var(--text-primary)', fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit',
}

const twoColumnsStyle: React.CSSProperties = {
  display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18, marginBottom: 18,
}

const panelStyle: React.CSSProperties = {
  background: 'var(--background-card)', border: '1px solid var(--border)', borderRadius: 16,
  padding: 20, marginBottom: 18,
}

const panelHeaderStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 14, marginBottom: 16,
}

const panelTitleStyle: React.CSSProperties = { margin: 0, color: 'var(--text-primary)', fontSize: 16, fontWeight: 900 }
const panelSubtitleStyle: React.CSSProperties = { margin: '4px 0 0', color: 'var(--text-muted)', fontSize: 13 }

const teamCardStyle: React.CSSProperties = {
  display: 'flex', gap: 12, alignItems: 'center', padding: 14, borderRadius: 13,
  border: '1px solid var(--border)', background: 'var(--bg-secondary)',
}

const avatarStyle: React.CSSProperties = {
  width: 42, height: 42, borderRadius: 12, display: 'grid', placeItems: 'center',
  background: 'var(--pink-bg)', color: 'var(--pink)', fontWeight: 900,
}

const infoGridStyle: React.CSSProperties = { display: 'grid', gap: 10 }

const infoRowStyle: React.CSSProperties = {
  display: 'flex', justifyContent: 'space-between', gap: 14, padding: '10px 0',
  borderBottom: '1px solid var(--border)', color: 'var(--text-muted)', fontSize: 13,
}

const apiListStyle: React.CSSProperties = { display: 'grid', gap: 10 }

const apiRowStyle: React.CSSProperties = {
  display: 'grid', gridTemplateColumns: '1fr auto', alignItems: 'center', gap: 14,
  padding: '14px 16px', border: '1px solid var(--border)', background: 'var(--bg-secondary)', borderRadius: 13,
}

const apiButtonStyle: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 11px', borderRadius: 9,
  border: '1px solid var(--border)', fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit',
}

const messageBoxStyle: React.CSSProperties = {
  padding: '12px 14px', borderRadius: 12, marginBottom: 16, color: 'var(--text-primary)',
  border: '1px solid var(--border)', background: 'var(--background-card)',
}

const emptyStateStyle: React.CSSProperties = {
  padding: 34, border: '1px dashed var(--border)', borderRadius: 16, color: 'var(--text-muted)',
  background: 'var(--background-card)', textAlign: 'center',
}

const emptyInlineStyle: React.CSSProperties = {
  padding: 18, border: '1px dashed var(--border)', borderRadius: 13, color: 'var(--text-muted)',
  background: 'var(--bg-secondary)', textAlign: 'center',
}
