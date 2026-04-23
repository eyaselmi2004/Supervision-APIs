import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Layout } from '../components/layout/Layout'
import { Header } from '../components/layout/Header'
import { useAuth } from '../hooks/useAuth'
import { ChevronLeft, Plus, Trash2, Check } from 'lucide-react'
import api from '../services/api'
import { apiServicesService } from '../services/apiServices.service'

interface Project {
  id: string
  name: string
  description?: string
  icon_key?: string
  color?: string
}

interface ApiService {
  id: string
  name: string
  base_url: string
  project_id?: string
}

export const ProjectDetailsPage: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>()
  const navigate = useNavigate()
  const { isAdmin } = useAuth()

  const [project, setProject] = useState<Project | null>(null)
  const [allApis, setAllApis] = useState<ApiService[]>([])
  const [projectApis, setProjectApis] = useState<ApiService[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (projectId) {
      loadData()
    }
  }, [projectId])

  const loadData = async () => {
    setLoading(true)
    try {
      // Charger le projet
      const projectRes = await api.get(`/projects/${projectId}`)
      setProject(projectRes.data)

      // Charger TOUTES les APIs
      const allApisRes = await api.get('/api-services')
      setAllApis(allApisRes.data)

      // Charger les APIs du projet
      const projectApisRes = await api.get(`/api-services?project_id=${projectId}`)
      setProjectApis(projectApisRes.data)
    } catch (e) {
      console.error('❌ Erreur chargement:', e)
    } finally {
      setLoading(false)
    }
  }

  const assignApiToProject = async (apiId: string) => {
    try {
      await api.put(`/api-services/${apiId}`, { project_id: projectId })
      console.log('✅ API assignée au projet')
      loadData()
    } catch (e) {
      console.error('❌ Erreur assignation:', e)
    }
  }

  const removeApiFromProject = async (apiId: string) => {
    try {
      await api.put(`/api-services/${apiId}`, { project_id: null })
      console.log('✅ API retirée du projet')
      loadData()
    } catch (e) {
      console.error('❌ Erreur retrait:', e)
    }
  }

  const unassignedApis = allApis.filter(api => !api.project_id || api.project_id !== projectId)
  const assignedApis = projectApis

  return (
    <Layout>
      <Header 
        title={project?.name || 'Projet'} 
        subtitle="Gérer les APIs de ce projet"
        actions={
          <button
            onClick={() => navigate('/projects')}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 14px',
              background: 'transparent', border: '1px solid var(--border)',
              borderRadius: '8px', color: 'var(--text-subtle)',
              fontSize: '12px', fontWeight: 600, cursor: 'pointer',
              fontFamily: 'Sora, sans-serif',
            }}
          >
            <ChevronLeft size={13} /> Retour
          </button>
        }
      />

      <div style={{ padding: '28px 32px' }}>
        {/* ── APIs assignées ── */}
        <div style={{ marginBottom: '40px' }}>
          <h3 style={{ margin: '0 0 16px', fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>
            ✅ APIs du projet ({assignedApis.length})
          </h3>
          {assignedApis.length === 0 ? (
            <div style={{ padding: '20px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px', textAlign: 'center', color: 'var(--text-subtle)' }}>
              Aucune API assignée
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '8px' }}>
              {assignedApis.map(api => (
                <div
                  key={api.id}
                  style={{
                    padding: '12px 16px',
                    background: 'var(--bg-card)',
                    border: '1px solid rgba(16,185,129,0.3)',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div>
                    <p style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {api.name}
                    </p>
                    <p style={{ margin: '2px 0 0', fontSize: '11px', color: 'var(--text-subtle)' }}>
                      {api.base_url}
                    </p>
                  </div>
                  <button
                    onClick={() => removeApiFromProject(api.id)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '4px',
                      padding: '4px 8px', background: 'rgba(239,68,68,0.1)',
                      border: '1px solid rgba(239,68,68,0.2)', borderRadius: '4px',
                      color: '#ef4444', fontSize: '11px', fontWeight: 600,
                      cursor: 'pointer', fontFamily: 'Sora, sans-serif',
                    }}
                  >
                    <Trash2 size={12} /> Retirer
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── APIs disponibles ── */}
        <div>
          <h3 style={{ margin: '0 0 16px', fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>
            ➕ APIs disponibles ({unassignedApis.length})
          </h3>
          {unassignedApis.length === 0 ? (
            <div style={{ padding: '20px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px', textAlign: 'center', color: 'var(--text-subtle)' }}>
              Toutes les APIs sont assignées
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '8px' }}>
              {unassignedApis.map(api => (
                <div
                  key={api.id}
                  style={{
                    padding: '12px 16px',
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div>
                    <p style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {api.name}
                    </p>
                    <p style={{ margin: '2px 0 0', fontSize: '11px', color: 'var(--text-subtle)' }}>
                      {api.base_url}
                    </p>
                  </div>
                  <button
                    onClick={() => assignApiToProject(api.id)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '4px',
                      padding: '4px 8px', background: 'rgba(16,185,129,0.1)',
                      border: '1px solid rgba(16,185,129,0.2)', borderRadius: '4px',
                      color: '#10b981', fontSize: '11px', fontWeight: 600,
                      cursor: 'pointer', fontFamily: 'Sora, sans-serif',
                    }}
                  >
                    <Plus size={12} /> Ajouter
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  )
}