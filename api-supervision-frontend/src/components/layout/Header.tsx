import React, { useEffect, useState } from 'react'
import { CheckCircle, AlertCircle, ChevronDown } from 'lucide-react'
import api from '../../services/api'
import { useProject } from '../../contexts/ProjectContext'
import { projectsService } from '../../services/projects.service'

interface HeaderProps {
  title: string
  subtitle?: string
  actions?: React.ReactNode
}

interface Project {
  id: string
  name: string
  description?: string
  icon_key?: string
  color?: string
  owner_id: string
  team_id?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export const Header: React.FC<HeaderProps> = ({ title, subtitle, actions }) => {
  const { selectedProject, setSelectedProject } = useProject()
  const [systemOk, setSystemOk] = useState(true)
  const [projects, setProjects] = useState<Project[]>([])
  const [showDropdown, setShowDropdown] = useState(false)

  useEffect(() => {
    const check = async () => {
      try {
        const [alertsRes, incidentsRes] = await Promise.all([
          api.get('/alerts?limit=50'),
          api.get('/incidents'),
        ])
        const hasAlerts = alertsRes.data.filter((a: any) => a.status === 'OPEN').length > 0
        const hasIncidents = incidentsRes.data.filter((i: any) => i.status === 'OPEN').length > 0
        setSystemOk(!hasAlerts && !hasIncidents)
      } catch {
        setSystemOk(true)
      }
    }
    check()
  }, [])

  useEffect(() => {
    const loadProjects = async () => {
      try {
        const data = await projectsService.getMyProjects()
        setProjects(data)
      } catch (e) {
        console.error('Error loading projects:', e)
        setProjects([])
      }
    }
    loadProjects()
  }, [])

  const handleProjectSelect = (project: Project) => {
    setSelectedProject(project)
    setShowDropdown(false)
  }

  const currentProject = selectedProject || (projects.length > 0 ? projects[0] : null)

  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 30,
        minHeight: 72,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 20,
        padding: '16px 28px',
        background: 'var(--background-card)',
        borderBottom: '1px solid var(--border)',
      }}
    >
      <div style={{ minWidth: 0 }}>
        <h1 style={{ margin: 0, fontSize: 18, lineHeight: 1.25, fontWeight: 850, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
          {title}
        </h1>
        {subtitle && (
          <p style={{ margin: '3px 0 0', fontSize: 12, color: 'var(--text-subtle)', fontWeight: 600 }}>
            {subtitle}
          </p>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
        {projects.length > 0 && (
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setShowDropdown(!showDropdown)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                minWidth: 176,
                justifyContent: 'space-between',
                padding: '9px 12px',
                borderRadius: 11,
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border)',
                color: 'var(--text-primary)',
                fontSize: 13,
                fontWeight: 750,
                cursor: 'pointer',
              }}
            >
              <span style={{ maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {currentProject ? currentProject.name : 'Select project'}
              </span>
              <ChevronDown size={15} style={{ transition: 'transform 0.18s', transform: showDropdown ? 'rotate(180deg)' : 'rotate(0deg)' }} />
            </button>

            {showDropdown && (
              <>
                <div
                  style={{
                    position: 'absolute',
                    top: 'calc(100% + 8px)',
                    right: 0,
                    background: 'var(--background-card)',
                    border: '1px solid var(--border)',
                    borderRadius: 14,
                    boxShadow: 'var(--shadow-md)',
                    minWidth: 250,
                    maxWidth: 340,
                    maxHeight: 340,
                    overflowY: 'auto',
                    zIndex: 60,
                    padding: 6,
                  }}
                >
                  {projects.map((project) => {
                    const active = currentProject?.id === project.id
                    return (
                      <button
                        key={project.id}
                        onClick={() => handleProjectSelect(project)}
                        style={{
                          width: '100%',
                          padding: '10px 11px',
                          textAlign: 'left',
                          border: `1px solid ${active ? 'rgba(217,109,148,0.22)' : 'transparent'}`,
                          borderRadius: 10,
                          background: active ? 'var(--pink-bg)' : 'transparent',
                          color: active ? 'var(--pink)' : 'var(--text-primary)',
                          fontSize: 13,
                          cursor: 'pointer',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          {active && <div style={{ width: 7, height: 7, borderRadius: 999, background: 'var(--pink-mid)', flexShrink: 0 }} />}
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <p style={{ margin: 0, fontWeight: active ? 800 : 650, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {project.name}
                            </p>
                            {project.description && (
                              <p style={{ margin: '2px 0 0', fontSize: 11, color: 'var(--text-subtle)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {project.description}
                              </p>
                            )}
                          </div>
                        </div>
                      </button>
                    )
                  })}
                </div>
                <div style={{ position: 'fixed', inset: 0, zIndex: 50 }} onClick={() => setShowDropdown(false)} />
              </>
            )}
          </div>
        )}

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 7,
            padding: '8px 11px',
            borderRadius: 999,
            background: systemOk ? 'var(--success-bg)' : 'var(--danger-bg)',
            border: `1px solid ${systemOk ? 'rgba(54,201,150,0.22)' : 'rgba(239,107,107,0.22)'}`,
          }}
        >
          {systemOk ? <CheckCircle size={14} style={{ color: 'var(--success)' }} /> : <AlertCircle size={14} style={{ color: 'var(--danger)' }} />}
          <span style={{ fontSize: 12, fontWeight: 800, color: systemOk ? 'var(--success)' : 'var(--danger)' }}>
            {systemOk ? 'Systems operational' : 'Incidents active'}
          </span>
        </div>

        {actions}
      </div>
    </header>
  )
}
