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
    <header className="sticky top-0 z-30 flex items-center justify-between px-8 py-4 bg-[var(--background-card)] border-b border-[var(--border)] backdrop-blur-xl">
      <div>
        <h1 className="m-0 text-base font-semibold text-[var(--text-primary)]">
          {title}
        </h1>
        {subtitle && (
          <p className="m-0 mt-0.5 text-xs text-[var(--text-subtle)]">
            {subtitle}
          </p>
        )}
      </div>

      <div className="flex items-center gap-4">
        {/* Project selector */}
        {projects.length > 0 && (
          <div className="relative">
            <button
              onClick={() => setShowDropdown(!showDropdown)}
              className="flex items-center gap-2 px-3 py-2 rounded-md bg-white/[0.02] border border-[var(--border)] text-[var(--text-primary)] text-sm font-medium cursor-pointer transition-all duration-200 hover:border-primary-400/60 hover:bg-primary-500/10"
            >
              <span className="max-w-[150px] overflow-hidden text-ellipsis whitespace-nowrap">
                {currentProject ? currentProject.name : 'Select project'}
              </span>
              <ChevronDown size={14} className={`transition-transform duration-200 ${showDropdown ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown Menu */}
            {showDropdown && (
              <>
                <div className="absolute top-full left-0 mt-2 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg shadow-lg min-w-[220px] max-w-[320px] max-h-[320px] overflow-y-auto z-50">
                  {projects.map((project, idx) => (
                    <button
                      key={project.id}
                      onClick={() => handleProjectSelect(project)}
                      className={`w-full px-3 py-2.5 text-left border-none ${
                        currentProject?.id === project.id
                          ? 'bg-primary-500/14 text-primary-200'
                          : 'bg-transparent text-[var(--text-primary)] hover:bg-white/[0.04]'
                      } ${idx < projects.length - 1 ? 'border-b border-[var(--border)]' : ''} text-sm cursor-pointer transition-all duration-200`}
                    >
                      <div className="flex items-center gap-2">
                        {currentProject?.id === project.id && (
                          <div className="w-1.5 h-1.5 rounded-full bg-primary-400 flex-shrink-0" />
                        )}
                        <div className="min-w-0 flex-1">
                          <p className={`m-0 ${
                            currentProject?.id === project.id ? 'font-semibold' : 'font-normal'
                          } overflow-hidden text-ellipsis whitespace-nowrap`}>
                            {project.name}
                          </p>
                          {project.description && (
                            <p className="m-0 mt-0.5 text-xs text-[var(--text-muted)] overflow-hidden text-ellipsis whitespace-nowrap">
                              {project.description}
                            </p>
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowDropdown(false)}
                />
              </>
            )}
          </div>
        )}

        {/* System status */}
        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full ${
          systemOk
            ? 'bg-success-500/10 border border-success-500/20'
            : 'bg-danger-500/10 border border-danger-500/20'
        } transition-all duration-300`}>
          {systemOk ? (
            <CheckCircle size={13} className="text-success-500" />
          ) : (
            <AlertCircle size={13} className="text-danger-500" />
          )}
          <span className={`text-xs font-medium ${
            systemOk ? 'text-success-500' : 'text-danger-500'
          }`}>
            {systemOk ? 'Systems operational' : 'Incidents active'}
          </span>
        </div>

        {actions}
      </div>
    </header>
  )
}
