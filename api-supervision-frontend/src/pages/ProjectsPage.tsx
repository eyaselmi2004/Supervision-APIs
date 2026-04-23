import React, { useEffect, useState } from 'react'
import { Plus, Trash2, Search, Copy, Check } from 'lucide-react'
import { Layout } from '../components/layout/Layout'
import { Modal } from '../components/ui/Modal'
import { Input } from '../components/ui/Input'
import { projectsService } from '../services/projects.service'
import { teamsService } from '../services/teams.service'
import { apiServicesService } from '../services/apiServices.service'
import { useProject } from '../contexts/ProjectContext'
import { useAuth } from '../hooks/useAuth'
import { useNavigate } from 'react-router-dom'
import type { Project } from '../types'

interface Team {
  id: string
  name: string
  description?: string
  invite_code: string
  owner_id: string
  is_active: boolean
  created_at: string
  updated_at: string
}

interface ApiService {
  id: string
  name: string
  base_url: string
  project_id?: string | null
}

export const ProjectsPage: React.FC = () => {
  const navigate = useNavigate()
  const { user, isAdmin } = useAuth()
  const { setSelectedProject } = useProject()

  const [projects, setProjects] = useState<Project[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [availableApis, setAvailableApis] = useState<ApiService[]>([])

  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [showJoinTeamModal, setShowJoinTeamModal] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterMyTeams, setFilterMyTeams] = useState(false)
  const [joinTeamCode, setJoinTeamCode] = useState('')
  const [copied, setCopied] = useState(false)

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    icon_key: '',
    color: '#d946ef',
    team_id: '',
    api_service_id: '',
    api_service_id_manual: '',
  })

  useEffect(() => {
    loadProjects()
    loadTeams()
    loadAvailableApis()
  }, [])

  const loadProjects = async () => {
    setLoading(true)
    try {
      const data = await projectsService.getMyProjects()
      setProjects(data)
    } catch (e) {
      console.error('❌ Erreur chargement projets:', e)
      setProjects([])
    } finally {
      setLoading(false)
    }
  }

  const loadTeams = async () => {
    try {
      const data = await teamsService.getAll()
      setTeams(data)
    } catch (e) {
      console.error('❌ Erreur chargement équipes:', e)
      setTeams([])
    }
  }

  const loadAvailableApis = async () => {
    try {
      const data = await apiServicesService.getAll()
      setAvailableApis(data as ApiService[])
    } catch (e) {
      console.error('❌ Erreur chargement APIs disponibles:', e)
      setAvailableApis([])
    }
  }

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      icon_key: '',
      color: '#d946ef',
      team_id: '',
      api_service_id: '',
      api_service_id_manual: '',
    })
  }

  const handleCreate = async () => {
    if (!formData.name.trim()) {
      alert('Veuillez saisir un nom de projet')
      return
    }

    try {
      console.log('🟣 formData before create =', formData)

      const projectPayload = {
        name: formData.name,
        description: formData.description,
        icon_key: formData.icon_key,
        color: formData.color,
        team_id: formData.team_id || null,
      }

      const createdProject = await projectsService.create(projectPayload)
      console.log('✅ createdProject =', createdProject)

      const apiIdToAssign =
        formData.api_service_id_manual.trim() || formData.api_service_id

      if (apiIdToAssign) {
        console.log('🔗 Assigning API to project...', {
          api_service_id: apiIdToAssign,
          project_id: createdProject.id,
        })

        const updatedApi = await apiServicesService.update(apiIdToAssign, {
          project_id: createdProject.id,
        })

        console.log('✅ API updated =', updatedApi)
      } else {
        console.log('⚠️ No API selected, skipping assignment')
      }

      resetForm()
      setShowModal(false)

      await Promise.all([loadProjects(), loadAvailableApis()])

      navigate(`/projects/${createdProject.id}`)
    } catch (e) {
      console.error('❌ Erreur création projet / assignation API:', e)
      alert("Le projet a peut-être été créé, mais l’assignation de l’API a échoué. Vérifie la console.")
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer ce projet ?')) return
    try {
      await projectsService.delete(id)
      await loadProjects()
    } catch (e) {
      console.error('❌ Erreur suppression:', e)
    }
  }

  const handleSelectProject = (project: Project) => {
    setSelectedProject(project)
    navigate(`/projects/${project.id}`)
  }

  const handleJoinTeam = () => {
    if (!joinTeamCode.trim()) {
      alert('Veuillez entrer un code valide')
      return
    }
    alert('Fonctionnalité en développement')
    setJoinTeamCode('')
    setShowJoinTeamModal(false)
  }

  const copyToClipboard = () => {
    navigator.clipboard.writeText(`Rejoignez mon équipe: ${window.location.origin}/projects?join=${user?.id}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const ICON_KEYS = [
    { key: 'dj', label: 'Django', emoji: '🐍' },
    { key: 'node', label: 'Node.js', emoji: '⚡' },
    { key: 'python', label: 'Python', emoji: '🐍' },
    { key: 'react', label: 'React', emoji: '⚛️' },
    { key: 'vue', label: 'Vue', emoji: '💚' },
    { key: 'fastapi', label: 'FastAPI', emoji: '🚀' },
    { key: 'spring', label: 'Spring', emoji: '🌱' },
    { key: 'laravel', label: 'Laravel', emoji: '🔥' },
  ]

  const filteredProjects = projects.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.description?.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesTeam = !filterMyTeams || !!p.team_id
    return matchesSearch && matchesTeam
  })

  const getProjectEmoji = (iconKey?: string) => {
    return ICON_KEYS.find((i) => i.key === iconKey)?.emoji || '🚀'
  }

  const fieldLabelStyle: React.CSSProperties = {
    display: 'block',
    marginBottom: '8px',
    fontSize: '13px',
    fontWeight: 600,
    color: 'var(--text-primary)',
  }

  const selectStyle: React.CSSProperties = {
    width: '100%',
    padding: '10px 12px',
    borderRadius: '8px',
    border: '1px solid var(--border)',
    background: 'var(--input-bg)',
    color: 'var(--text-primary)',
    fontSize: '14px',
    outline: 'none',
  }

  return (
    <Layout>
      <div style={{ padding: '0 32px' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '28px 0 24px',
            borderBottom: '1px solid var(--border)',
            position: 'relative',
            zIndex: 20,
          }}
        >
          <div>
            <h1 style={{ margin: 0, fontSize: '28px', fontWeight: 700, color: 'var(--text-primary)' }}>
              Projets
            </h1>
            <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--text-muted)' }}>
              {isAdmin ? 'Créez et gérez vos projets' : 'Sélectionnez un projet'}
            </p>
          </div>

          <div style={{ display: 'flex', gap: '12px', position: 'relative', zIndex: 20 }}>
            {!isAdmin && (
              <button
                type="button"
                onClick={() => setShowJoinTeamModal(true)}
                style={{
                  padding: '10px 16px',
                  borderRadius: '10px',
                  border: '1px solid var(--border)',
                  background: 'var(--bg-card)',
                  color: 'var(--text-primary)',
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
              >
                Rejoindre une équipe
              </button>
            )}

            {isAdmin && (
              <button
                type="button"
                onClick={() => {
                  console.log('create project clicked')
                  resetForm()
                  setShowModal(true)
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 16px',
                  borderRadius: '10px',
                  border: '1px solid var(--border)',
                  background: 'var(--bg-card)',
                  color: 'var(--text-primary)',
                  cursor: 'pointer',
                  fontWeight: 600,
                  position: 'relative',
                  zIndex: 10,
                  pointerEvents: 'auto',
                }}
              >
                <Plus size={16} />
                Créer un projet
              </button>
            )}
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            gap: '12px',
            padding: '20px 0',
            alignItems: 'center',
          }}
        >
          <div
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              background: 'var(--input-bg)',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              paddingLeft: '12px',
            }}
          >
            <Search size={16} color="var(--text-muted)" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher par nom ou description..."
              style={{
                flex: 1,
                border: 'none',
                outline: 'none',
                background: 'transparent',
                padding: '12px',
                fontSize: '14px',
                color: 'var(--text-primary)',
              }}
            />
          </div>

          <button
            onClick={() => setFilterMyTeams((v) => !v)}
            style={{
              padding: '10px 16px',
              borderRadius: '8px',
              border: '1px solid var(--border)',
              background: filterMyTeams ? 'rgba(217,70,239,0.12)' : 'var(--bg-card)',
              color: 'var(--text-primary)',
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            Mes projets
          </button>
        </div>

        {loading ? (
          <div style={{ padding: '24px 0', color: 'var(--text-muted)' }}>Chargement...</div>
        ) : filteredProjects.length === 0 ? (
          <div style={{ padding: '24px 0', color: 'var(--text-muted)' }}>Aucun projet trouvé.</div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
              gap: '24px',
              paddingBottom: '32px',
            }}
          >
            {filteredProjects.map((project) => (
              <div
                key={project.id}
                style={{
                  border: '1px solid var(--border)',
                  borderRadius: '16px',
                  overflow: 'hidden',
                  background: 'var(--bg-card)',
                }}
              >
                <div
                  style={{
                    background: 'rgba(217,70,239,0.08)',
                    padding: '18px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                  }}
                >
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <div
                      style={{
                        width: '44px',
                        height: '44px',
                        borderRadius: '12px',
                        display: 'grid',
                        placeItems: 'center',
                        background: '#eef2ff',
                        fontSize: '24px',
                      }}
                    >
                      {getProjectEmoji(project.icon_key)}
                    </div>
                    <div>
                      <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text-primary)' }}>{project.name}</div>
                      <div style={{ fontSize: '14px', color: 'var(--text-muted)' }}>{project.icon_key || 'Projet'}</div>
                    </div>
                  </div>

                  <button
                    style={{
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      color: 'var(--text-muted)',
                      fontSize: '18px',
                    }}
                    title="Favori"
                  >
                    ☆
                  </button>
                </div>

                <div style={{ padding: '14px 18px', color: 'var(--text-secondary)', minHeight: '52px' }}>
                  {project.description || 'Sans description'}
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: '12px',
                    padding: '18px',
                    borderTop: '1px solid var(--border)',
                    borderBottom: '1px solid var(--border)',
                  }}
                >
                  <div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px' }}>ERREURS</div>
                    <div style={{ fontSize: '18px', fontWeight: 700 }}>0</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px' }}>TRANSACTIONS</div>
                    <div style={{ fontSize: '18px', fontWeight: 700 }}>0</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px' }}>SANTÉ</div>
                    <div style={{ fontSize: '18px', fontWeight: 700, color: '#10b981' }}>100%</div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px', padding: '12px 18px' }}>
                  <button
                    onClick={() => navigate(`/projects/${project.id}`)}
                    style={{
                      flex: 1,
                      padding: '10px 14px',
                      borderRadius: '10px',
                      border: '1px solid var(--border)',
                      background: 'var(--bg-card)',
                      cursor: 'pointer',
                      fontWeight: 600,
                    }}
                  >
                    ⚡ APIs
                  </button>

                  <button
                    onClick={() => handleSelectProject(project)}
                    style={{
                      flex: 1,
                      padding: '10px 14px',
                      borderRadius: '10px',
                      border: '1px solid var(--border)',
                      background: 'var(--bg-card)',
                      cursor: 'pointer',
                      fontWeight: 600,
                    }}
                  >
                    Sélectionner
                  </button>

                  <button
                    onClick={() => handleDelete(project.id)}
                    style={{
                      width: '40px',
                      borderRadius: '10px',
                      border: '1px solid var(--border)',
                      background: 'var(--bg-card)',
                      cursor: 'pointer',
                    }}
                    title="Supprimer"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <Modal
          open={showModal}
          onClose={() => setShowModal(false)}
          title="Créer un nouveau projet"
        >
          <div style={{ display: 'grid', gap: '16px' }}>
            <div>
              <label style={fieldLabelStyle}>Nom du projet</label>
              <Input
                value={formData.name}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ex: API de paiement"
              />
            </div>

            <div>
              <label style={fieldLabelStyle}>Description</label>
              <Input
                value={formData.description}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Description optionnelle"
              />
            </div>

            <div>
              <label style={fieldLabelStyle}>Type de projet</label>
              <select
                value={formData.icon_key}
                onChange={(e) => setFormData({ ...formData, icon_key: e.target.value })}
                style={selectStyle}
              >
                <option value="">Sélectionner un type</option>
                {ICON_KEYS.map((icon) => (
                  <option key={icon.key} value={icon.key}>
                    {icon.emoji} {icon.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={fieldLabelStyle}>Couleur du projet</label>
              <input
                type="color"
                value={formData.color}
                onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                style={{
                  width: '100%',
                  height: '44px',
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                  background: 'transparent',
                  cursor: 'pointer',
                }}
              />
            </div>

            <div>
              <label style={fieldLabelStyle}>Équipe du projet (optionnel)</label>
              <select
                value={formData.team_id}
                onChange={(e) => setFormData({ ...formData, team_id: e.target.value })}
                style={selectStyle}
              >
                <option value="">Aucune équipe</option>
                {teams.map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.name}
                  </option>
                ))}
              </select>
              <p style={{ marginTop: '6px', fontSize: '12px', color: 'var(--text-muted)' }}>
                Sélectionnez une équipe pour que les membres y aient accès
              </p>
            </div>

            <div>
              <label style={fieldLabelStyle}>API à assigner (optionnel)</label>
              <select
                value={formData.api_service_id}
                onChange={(e) => setFormData({ ...formData, api_service_id: e.target.value })}
                style={selectStyle}
              >
                <option value="">Aucune API</option>
                {availableApis.map((api) => (
                  <option key={api.id} value={api.id}>
                    {api.name}{api.project_id ? ' (déjà assignée)' : ''}
                  </option>
                ))}
              </select>
              <p style={{ marginTop: '6px', fontSize: '12px', color: 'var(--text-muted)' }}>
                Cette API sera automatiquement liée au projet après sa création.
              </p>
            </div>

            <div>
              <label style={fieldLabelStyle}>API service ID manuel (optionnel)</label>
              <Input
                value={formData.api_service_id_manual}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setFormData({ ...formData, api_service_id_manual: e.target.value })
                }
                placeholder="Ex: 9d9a3305-93f4-4f27-9c0b-e92518d3c5f0"
              />
              <p style={{ marginTop: '6px', fontSize: '12px', color: 'var(--text-muted)' }}>
                Si l’API n’apparaît pas dans la liste, collez son UUID ici.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                style={{
                  padding: '10px 16px',
                  borderRadius: '10px',
                  border: '1px solid var(--border)',
                  background: 'var(--bg-card)',
                  color: 'var(--text-primary)',
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
              >
                Annuler
              </button>

              <button
                type="button"
                onClick={handleCreate}
                style={{
                  padding: '10px 16px',
                  borderRadius: '10px',
                  border: '1px solid var(--border)',
                  background: 'var(--bg-card)',
                  color: 'var(--text-primary)',
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
              >
                Créer le projet
              </button>
            </div>
          </div>
        </Modal>

        <Modal
          open={showJoinTeamModal}
          onClose={() => setShowJoinTeamModal(false)}
          title="Rejoindre une équipe"
        >
          <div style={{ display: 'grid', gap: '16px' }}>
            <div>
              <label style={fieldLabelStyle}>Code d’équipe</label>
              <Input
                value={joinTeamCode}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setJoinTeamCode(e.target.value)}
                placeholder="Entrez le code d’invitation"
              />
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                type="button"
                onClick={() => setShowJoinTeamModal(false)}
                style={{
                  padding: '10px 16px',
                  borderRadius: '10px',
                  border: '1px solid var(--border)',
                  background: 'var(--bg-card)',
                  color: 'var(--text-primary)',
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
              >
                Annuler
              </button>

              <button
                type="button"
                onClick={handleJoinTeam}
                style={{
                  padding: '10px 16px',
                  borderRadius: '10px',
                  border: '1px solid var(--border)',
                  background: 'var(--bg-card)',
                  color: 'var(--text-primary)',
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
              >
                Rejoindre
              </button>
            </div>

            <div
              style={{
                marginTop: '8px',
                paddingTop: '12px',
                borderTop: '1px solid var(--border)',
              }}
            >
              <button
                onClick={copyToClipboard}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: 0,
                }}
              >
                {copied ? <Check size={16} /> : <Copy size={16} />}
                {copied ? 'Lien copié' : 'Copier un lien d’invitation'}
              </button>
            </div>
          </div>
        </Modal>
      </div>
    </Layout>
  )
}