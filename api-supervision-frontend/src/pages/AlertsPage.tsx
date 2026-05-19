import React, { useEffect, useState } from 'react'
import {
  Plus,
  Bell,
  Settings,
  Trash2,
  CheckCheck,
  CircleCheck,
  ChevronDown,
  FolderOpen,
  BrainCircuit,
} from 'lucide-react'
import { Layout } from '../components/layout/Layout'
import { Header } from '../components/layout/Header'
import { Button } from '../components/ui/Button'
import { Modal } from '../components/ui/Modal'
import { Input, Select } from '../components/ui/Input'
import { AlertSeverityBadge, StatusTypeBadge } from '../components/ui/Badge'
import { StatusBadgeWithDot } from '../components/ui/StatusIndicator'
import { alertsService } from '../services/alerts.service'
import { apiServicesService } from '../services/apiServices.service'
import { projectsService } from '../services/projects.service'
import { teamsService } from '../services/teams.service'
import { llmService } from '../services/llm.service'
import { useAuth } from '../hooks/useAuth'
import { useProject } from '../contexts/ProjectContext'
import api from '../services/api'
import type { Alert, AlertRule, Endpoint } from '../types'

const TYPES_REGLES = [
  { value: 'LATENCY', label: 'Latence (ms)' },
  { value: 'ERROR_RATE', label: "Taux d'erreur (%)" },
  { value: 'DOWNTIME', label: 'Indisponibilité' },
]

const FILTRES_STATUT = [
  { value: '', label: 'Tous les statuts' },
  { value: 'OPEN', label: 'Ouvertes' },
  { value: 'ACKNOWLEDGED', label: 'Prises en charge' },
  { value: 'RESOLVED', label: 'Résolues' },
]

interface ProjectMember {
  id: string
  name: string
  email?: string
  role?: string
}

const UserAvatar: React.FC<{ name?: string; size?: number }> = ({ name = '?', size = 32 }) => {
  const initials = name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: 'var(--pink-bg)',
        border: '1px solid var(--border)',
        color: 'var(--pink)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: size === 32 ? '13px' : '11px',
        fontWeight: 800,
        flexShrink: 0,
      }}
    >
      {initials}
    </div>
  )
}

const AssigneeDropdown: React.FC<{
  alertId: string
  assignedTo?: string
  members: ProjectMember[]
  onAssign: (alertId: string, userId?: string) => void
}> = ({ alertId, assignedTo, members, onAssign }) => {
  const [isOpen, setIsOpen] = useState(false)
  const assignedUser = members.find((u) => u.id === assignedTo)

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        style={{
          width: '100%',
          height: '38px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '8px',
          padding: '0 10px',
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border)',
          borderRadius: '10px',
          cursor: 'pointer',
          color: 'var(--text-primary)',
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
          {assignedUser ? (
            <>
              <UserAvatar name={assignedUser.name} size={24} />
              <span
                style={{
                  fontSize: '12px',
                  fontWeight: 700,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {assignedUser.name}
              </span>
            </>
          ) : (
            <span style={{ fontSize: '12px', color: 'var(--text-subtle)' }}>
              Non assigné
            </span>
          )}
        </span>

        <ChevronDown size={14} style={{ color: 'var(--text-subtle)' }} />
      </button>

      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            right: 0,
            width: '280px',
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: '12px',
            boxShadow: '0 18px 40px rgba(0,0,0,0.35)',
            zIndex: 9999,
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              padding: '10px 12px',
              borderBottom: '1px solid var(--border)',
              fontSize: '11px',
              fontWeight: 800,
              color: 'var(--text-subtle)',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
            }}
          >
            Membres de l’équipe du projet
          </div>

          <button
            type="button"
            onClick={() => {
              onAssign(alertId, undefined)
              setIsOpen(false)
            }}
            style={{
              width: '100%',
              padding: '11px 12px',
              background: !assignedTo ? 'var(--bg-secondary)' : 'transparent',
              border: 'none',
              borderBottom: '1px solid var(--border)',
              textAlign: 'left',
              cursor: 'pointer',
              fontSize: '13px',
              color: 'var(--text-muted)',
            }}
          >
            Non assigné
          </button>

          {members.length === 0 ? (
            <div
              style={{
                padding: '14px 12px',
                fontSize: '12px',
                color: 'var(--text-subtle)',
                textAlign: 'center',
              }}
            >
              Aucun membre dans l’équipe du projet
            </div>
          ) : (
            members.map((member) => (
              <button
                type="button"
                key={member.id}
                onClick={() => {
                  onAssign(alertId, member.id)
                  setIsOpen(false)
                }}
                style={{
                  width: '100%',
                  padding: '11px 12px',
                  background: assignedTo === member.id ? 'var(--bg-secondary)' : 'transparent',
                  border: 'none',
                  borderBottom: '1px solid var(--border)',
                  textAlign: 'left',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  color: 'var(--text-primary)',
                }}
              >
                <UserAvatar name={member.name} size={28} />

                <span style={{ minWidth: 0 }}>
                  <span
                    style={{
                      display: 'block',
                      fontSize: '13px',
                      fontWeight: 800,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {member.name}
                  </span>

                  <span
                    style={{
                      display: 'block',
                      fontSize: '11px',
                      color: 'var(--text-subtle)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {member.email || member.role || 'member'}
                  </span>
                </span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}


interface AnalysisSection {
  title: string
  body: string
}

const parseAiAnalysisSections = (analysis: string): AnalysisSection[] => {
  if (!analysis.trim()) return []

  const blocks = analysis
    .split(/(?=^\s*\d+\.\s+)/gm)
    .map((block) => block.trim())
    .filter(Boolean)

  if (blocks.length === 0) {
    return [{ title: 'Analyse IA', body: analysis.trim() }]
  }

  return blocks.map((block) => {
    const lines = block.split('\n').map((line) => line.trim()).filter(Boolean)
    const firstLine = lines[0] || 'Analyse IA'
    const title = firstLine.replace(/^\d+\.\s*/, '').replace(/\s*:\s*$/, '')
    const body = lines.slice(1).join('\n').replace(/^[-•]\s*/gm, '• ')

    return {
      title,
      body: body || 'Aucun détail supplémentaire.',
    }
  })
}

const getCorrelationStats = (alerts: Alert[]) => {
  const open = alerts.filter((alert) => alert.status === 'OPEN').length
  const critical = alerts.filter((alert) => alert.severity === 'CRITICAL').length
  const warning = alerts.filter((alert) => alert.severity === 'WARNING').length

  return { open, critical, warning }
}

export const AlertsPage: React.FC = () => {
  const { isAdmin, isDevOps, user } = useAuth()
  const { selectedProject } = useProject()

  const [alerts, setAlerts] = useState<Alert[]>([])
  const [rules, setRules] = useState<AlertRule[]>([])
  const [endpoints, setEndpoints] = useState<Endpoint[]>([])
  const [projectMembers, setProjectMembers] = useState<ProjectMember[]>([])

  const [tab, setTab] = useState<'alerts' | 'rules'>('alerts')
  const [statusFilter, setStatusFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [showRuleModal, setShowRuleModal] = useState(false)
  const [showCorrelationModal, setShowCorrelationModal] = useState(false)
  const [correlationLoading, setCorrelationLoading] = useState(false)
  const [correlationAnalysis, setCorrelationAnalysis] = useState('')
  const [correlationError, setCorrelationError] = useState('')
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const [ruleForm, setRuleForm] = useState({
    name: '',
    type: 'LATENCY',
    threshold: '',
    window_seconds: '60',
    endpoint_id: '',
    is_enabled: true,
  })

  useEffect(() => {
    loadAll()
    loadEndpoints()
    loadProjectMembers()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProject?.id])

  useEffect(() => {
    loadAlerts()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, selectedProject?.id])

  const loadAll = async () => {
    setLoading(true)

    try {
      const [a, r] = await Promise.all([
        loadAlertsData(),
        alertsService.getRules(),
      ])

      setAlerts(a)
      setRules(r)
    } finally {
      setLoading(false)
    }
  }

  const loadAlertsData = async (): Promise<Alert[]> => {
    if (!selectedProject?.id) return []

    const res = await api.get<Alert[]>('/alerts', {
      params: {
        project_id: selectedProject.id,
        status: statusFilter || undefined,
        limit: 100,
      },
    })

    return Array.isArray(res.data) ? res.data : []
  }

  const loadAlerts = async () => {
    const data = await loadAlertsData()
    setAlerts(data)
  }

  const loadEndpoints = async () => {
    try {
      if (!selectedProject?.id) {
        setEndpoints([])
        setRuleForm((f) => ({ ...f, endpoint_id: '' }))
        return
      }

      const services = await apiServicesService.getByProject(selectedProject.id)
      const allEps: Endpoint[] = []

      for (const svc of services) {
        const eps = await apiServicesService.getEndpoints(svc.id)
        allEps.push(...eps)
      }

      setEndpoints(allEps)

      setRuleForm((f) => ({
        ...f,
        endpoint_id: allEps[0]?.id ?? '',
      }))
    } catch (e) {
      console.error('Erreur chargement endpoints:', e)
      setEndpoints([])
    }
  }

  const loadProjectMembers = async () => {
    setProjectMembers([])

    try {
      if (!selectedProject?.id) return

      const fullProject = await projectsService.getById(selectedProject.id)

      if (!fullProject.team_id) {
        setProjectMembers([])
        return
      }

      const members = await teamsService.getMembers(fullProject.team_id)

      const cleanMembers = members.map((member: any) => ({
        id: member.user_id,
        name: member.name || member.email || 'Utilisateur',
        email: member.email,
        role: member.role,
      }))

      setProjectMembers(cleanMembers)
    } catch (e) {
      console.error('Erreur chargement membres équipe projet:', e)
      setProjectMembers([])
    }
  }

  const handleAcknowledge = async (alertId: string) => {
    setActionLoading(alertId)

    try {
      await alertsService.acknowledge(alertId, user?.id || '')
      await loadAlerts()
    } finally {
      setActionLoading(null)
    }
  }

  const handleResolve = async (alertId: string) => {
    setActionLoading(alertId)

    try {
      await alertsService.resolve(alertId)
      await loadAlerts()
    } finally {
      setActionLoading(null)
    }
  }

  const handleAssign = async (alertId: string, userId?: string) => {
    setActionLoading(alertId)

    try {
      setAlerts((current) =>
        current.map((alert) =>
          alert.id === alertId ? { ...alert, assigned_to_id: userId } : alert,
        ),
      )
    } finally {
      setActionLoading(null)
    }
  }

  const handleCreateRule = async () => {
    await alertsService.createRule({
      name: ruleForm.name,
      type: ruleForm.type as any,
      threshold: parseFloat(ruleForm.threshold),
      window_seconds: parseInt(ruleForm.window_seconds),
      endpoint_id: ruleForm.endpoint_id,
      is_enabled: true,
    })

    setShowRuleModal(false)

    setRuleForm({
      name: '',
      type: 'LATENCY',
      threshold: '',
      window_seconds: '60',
      endpoint_id: endpoints[0]?.id ?? '',
      is_enabled: true,
    })

    const r = await alertsService.getRules()
    setRules(r)
  }

  const handleDeleteRule = async (id: string) => {
    if (!confirm('Supprimer cette règle de surveillance ?')) return

    await alertsService.deleteRule(id)
    const r = await alertsService.getRules()
    setRules(r)
  }


  const buildAlertCorrelationPayload = () => {
    return alerts.map((alert) => ({
      id: alert.id,
      message: alert.message,
      severity: alert.severity,
      status: alert.status,
      created_at: alert.created_at,
      resolved_at: (alert as any).resolved_at,
      rule_id: (alert as any).rule_id,
      endpoint_id: (alert as any).endpoint_id,
      api_service_id: (alert as any).api_service_id,
      project_id: selectedProject?.id,
      assigned_to_id: (alert as any).assigned_to_id,
    }))
  }

  const handleCorrelateAlerts = async () => {
    if (!alerts.length) return

    setCorrelationLoading(true)
    setCorrelationError('')
    setCorrelationAnalysis('')
    setShowCorrelationModal(true)

    try {
      const response = await llmService.correlateAlerts(buildAlertCorrelationPayload())
      setCorrelationAnalysis(response.analysis)
    } catch (error: any) {
      console.error('Erreur corrélation IA alertes:', error)
      setCorrelationError(
        error?.response?.data?.detail ||
          "Impossible de générer la corrélation IA des alertes pour le moment.",
      )
    } finally {
      setCorrelationLoading(false)
    }
  }

  const openCount = alerts.filter((a) => a.status === 'OPEN').length
  const correlationSections = parseAiAnalysisSections(correlationAnalysis)
  const correlationStats = getCorrelationStats(alerts)

  return (
    <Layout>
      <Header
        title="Alertes"
        subtitle={
          selectedProject
            ? `Alertes liées au projet : ${selectedProject.name}`
            : 'Sélectionnez un projet pour consulter ses alertes'
        }
        actions={
          tab === 'rules' && isAdmin && selectedProject ? (
            <Button icon={Plus} onClick={() => setShowRuleModal(true)}>
              Nouvelle règle
            </Button>
          ) : undefined
        }
      />

      <div style={{ padding: '24px 32px' }}>
        {!selectedProject ? (
          <div
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: '16px',
              padding: '56px',
              textAlign: 'center',
            }}
          >
            <FolderOpen size={38} color="var(--text-subtle)" style={{ marginBottom: 14 }} />
            <h3 style={{ margin: 0, color: 'var(--text-primary)', fontSize: 18 }}>
              Aucun projet sélectionné
            </h3>
            <p style={{ margin: '8px auto 0', color: 'var(--text-subtle)', maxWidth: 440 }}>
              Les alertes sont filtrées par projet. Sélectionnez un projet depuis le header ou depuis la page projets.
            </p>
          </div>
        ) : (
          <>
            <div
              style={{
                display: 'flex',
                gap: '4px',
                marginBottom: '24px',
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                borderRadius: '10px',
                padding: '4px',
                width: 'fit-content',
              }}
            >
              {[
                { key: 'alerts' as const, label: `Alertes (${alerts.length})`, icon: Bell },
                { key: 'rules' as const, label: `Règles (${rules.length})`, icon: Settings },
              ].map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => setTab(key)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 16px',
                    borderRadius: '7px',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: 600,
                    fontFamily: 'Inter, sans-serif',
                    background: tab === key ? 'var(--bg-secondary)' : 'transparent',
                    color: tab === key ? 'var(--text-primary)' : 'var(--text-muted)',
                  }}
                >
                  <Icon size={14} />
                  {label}
                </button>
              ))}
            </div>

            {tab === 'alerts' && (
              <>
                <div style={{ marginBottom: '16px', display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-subtle)' }}>
                    Filtrer par:
                  </label>

                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    style={{
                      padding: '8px 12px',
                      background: 'var(--input-bg)',
                      border: '1px solid var(--border)',
                      borderRadius: '8px',
                      color: 'var(--text-primary)',
                      fontSize: '13px',
                      outline: 'none',
                      fontFamily: 'Inter, sans-serif',
                      cursor: 'pointer',
                    }}
                  >
                    {FILTRES_STATUT.map((f) => (
                      <option key={f.value} value={f.value}>
                        {f.label}
                      </option>
                    ))}
                  </select>

                  <Button
                    size="sm"
                    variant="secondary"
                    icon={BrainCircuit}
                    loading={correlationLoading}
                    disabled={alerts.length < 2}
                    onClick={handleCorrelateAlerts}
                  >
                    AI Correlation
                  </Button>

                  <span style={{ fontSize: '12px', color: 'var(--text-subtle)' }}>
                    {alerts.length < 2
                      ? 'Au moins 2 alertes nécessaires'
                      : `${alerts.length} alertes analysables`}
                  </span>
                </div>

                <div
                  style={{
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border)',
                    borderRadius: '12px',
                    overflow: 'visible',
                  }}
                >
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '140px 1fr 140px 160px 220px 220px',
                      padding: '12px 20px',
                      borderBottom: '1px solid var(--border)',
                      background: 'var(--bg-secondary)',
                    }}
                  >
                    {['Sévérité', 'Message', 'Statut', 'Date', 'Assigné', 'Actions'].map((h) => (
                      <span
                        key={h}
                        style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          color: 'var(--text-subtle)',
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                        }}
                      >
                        {h}
                      </span>
                    ))}
                  </div>

                  {loading ? (
                    <div style={{ padding: '20px' }}>
                      {[...Array(4)].map((_, i) => (
                        <div
                          key={i}
                          className="skeleton"
                          style={{ height: '52px', marginBottom: '8px', borderRadius: '6px' }}
                        />
                      ))}
                    </div>
                  ) : alerts.length === 0 ? (
                    <div style={{ padding: '56px', textAlign: 'center' }}>
                      <Bell size={32} color="var(--text-subtle)" style={{ marginBottom: '12px' }} />
                      <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-subtle)' }}>
                        Aucune alerte pour ce projet.
                      </p>
                    </div>
                  ) : (
                    alerts.map((alert) => (
                      <div
                        key={alert.id}
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '140px 1fr 140px 160px 220px 220px',
                          padding: '14px 20px',
                          borderBottom: '1px solid var(--border)',
                          alignItems: 'center',
                          background:
                            alert.status === 'OPEN' && alert.severity === 'CRITICAL'
                              ? 'rgba(239,68,68,0.04)'
                              : 'transparent',
                        }}
                      >
                        <AlertSeverityBadge severity={alert.severity} />

                        <p
                          style={{
                            margin: 0,
                            fontSize: '13px',
                            color: 'var(--text-primary)',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            paddingRight: '16px',
                          }}
                        >
                          {alert.message}
                        </p>

                        <StatusBadgeWithDot
                          status={
                            alert.status === 'OPEN'
                              ? 'open'
                              : alert.status === 'ACKNOWLEDGED'
                                ? 'in-progress'
                                : 'resolved'
                          }
                          animated={alert.status === 'OPEN'}
                        />

                        <span style={{ fontSize: '12px', color: 'var(--text-subtle)' }}>
                          {new Date(alert.created_at).toLocaleString('fr-FR', {
                            day: '2-digit',
                            month: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>

                        <AssigneeDropdown
                          alertId={alert.id}
                          assignedTo={(alert as any).assigned_to_id}
                          members={projectMembers}
                          onAssign={handleAssign}
                        />

                        <div style={{ display: 'flex', gap: '8px' }}>
                          {alert.status === 'OPEN' && isDevOps && (
                            <Button
                              size="sm"
                              variant="secondary"
                              icon={CheckCheck}
                              loading={actionLoading === alert.id}
                              onClick={() => handleAcknowledge(alert.id)}
                            >
                              Prendre en charge
                            </Button>
                          )}

                          {alert.status === 'ACKNOWLEDGED' && isDevOps && (
                            <Button
                              size="sm"
                              variant="secondary"
                              icon={CircleCheck}
                              loading={actionLoading === alert.id}
                              onClick={() => handleResolve(alert.id)}
                            >
                              Résoudre
                            </Button>
                          )}

                          {alert.status === 'RESOLVED' && (
                            <span style={{ fontSize: '12px', color: '#10b981' }}>✓ Résolue</span>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </>
            )}

            {tab === 'rules' && (
              <div
                style={{
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border)',
                  borderRadius: '12px',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: `1fr 160px 120px 120px 90px${isAdmin ? ' 50px' : ''}`,
                    padding: '12px 20px',
                    borderBottom: '1px solid var(--border)',
                    background: 'var(--bg-secondary)',
                  }}
                >
                  {['Nom de la règle', 'Type', 'Seuil', 'Fenêtre', 'Statut', ...(isAdmin ? [''] : [])].map((h) => (
                    <span
                      key={h}
                      style={{
                        fontSize: '11px',
                        fontWeight: 700,
                        color: 'var(--text-subtle)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                      }}
                    >
                      {h}
                    </span>
                  ))}
                </div>

                {rules.length === 0 ? (
                  <div style={{ padding: '56px', textAlign: 'center' }}>
                    <Settings size={32} color="var(--text-subtle)" style={{ marginBottom: '12px' }} />
                    <p style={{ margin: '0 0 16px', fontSize: '13px', color: 'var(--text-subtle)' }}>
                      Aucune règle de surveillance configurée
                    </p>
                    {isAdmin && (
                      <Button icon={Plus} size="sm" onClick={() => setShowRuleModal(true)}>
                        Créer une règle
                      </Button>
                    )}
                  </div>
                ) : (
                  rules.map((rule) => (
                    <div
                      key={rule.id}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: `1fr 160px 120px 120px 90px${isAdmin ? ' 50px' : ''}`,
                        padding: '14px 20px',
                        borderBottom: '1px solid var(--border)',
                        alignItems: 'center',
                      }}
                    >
                      <p style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                        {rule.name}
                      </p>

                      <StatusTypeBadge type={rule.type} />

                      <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--pink)', fontFamily: 'monospace' }}>
                        {rule.threshold}
                        {rule.type === 'LATENCY' ? ' ms' : ' %'}
                      </span>

                      <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                        {rule.window_seconds >= 3600
                          ? `${rule.window_seconds / 3600}h`
                          : rule.window_seconds >= 60
                            ? `${rule.window_seconds / 60} min`
                            : `${rule.window_seconds} sec`}
                      </span>

                      <span style={{ fontSize: '11px', fontWeight: 700, color: rule.is_enabled ? '#34d399' : 'var(--text-subtle)' }}>
                        {rule.is_enabled ? '● Actif' : '○ Inactif'}
                      </span>

                      {isAdmin && (
                        <button
                          onClick={() => handleDeleteRule(rule.id)}
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            color: 'var(--text-subtle)',
                            padding: '4px',
                            borderRadius: '6px',
                            display: 'flex',
                            alignItems: 'center',
                          }}
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}
          </>
        )}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {isAdmin && (
        <Modal
          open={showRuleModal}
          onClose={() => setShowRuleModal(false)}
          title="Nouvelle règle de surveillance"
          size="md"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <Input
              label="Nom de la règle"
              value={ruleForm.name}
              onChange={(e) => setRuleForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Ex : Latence élevée API Paiement"
            />

            <Select
              label="Type de surveillance"
              value={ruleForm.type}
              onChange={(e) => setRuleForm((f) => ({ ...f, type: e.target.value }))}
              options={TYPES_REGLES}
            />

            <Input
              label={ruleForm.type === 'LATENCY' ? 'Seuil de latence (ms)' : "Seuil du taux d'erreur (%)"}
              type="number"
              value={ruleForm.threshold}
              onChange={(e) => setRuleForm((f) => ({ ...f, threshold: e.target.value }))}
              placeholder={ruleForm.type === 'LATENCY' ? '500' : '5'}
            />

            <Input
              label="Fenêtre d'analyse (secondes)"
              type="number"
              value={ruleForm.window_seconds}
              onChange={(e) => setRuleForm((f) => ({ ...f, window_seconds: e.target.value }))}
              placeholder="60"
            />

            <Select
              label="Endpoint à surveiller"
              value={ruleForm.endpoint_id}
              onChange={(e) => setRuleForm((f) => ({ ...f, endpoint_id: e.target.value }))}
              options={
                endpoints.length === 0
                  ? [{ value: '', label: 'Aucun endpoint disponible pour ce projet' }]
                  : endpoints.map((ep) => ({
                      value: ep.id,
                      label: `${ep.method} ${ep.path}`,
                    }))
              }
            />

            <div style={{ display: 'flex', gap: '12px', paddingTop: '8px' }}>
              <Button variant="secondary" onClick={() => setShowRuleModal(false)} style={{ flex: 1 }}>
                Annuler
              </Button>

              <Button
                onClick={handleCreateRule}
                disabled={!ruleForm.name || !ruleForm.threshold || !ruleForm.endpoint_id}
                style={{ flex: 1 }}
              >
                Créer la règle
              </Button>
            </div>
          </div>
        </Modal>
      )}


      <Modal
        open={showCorrelationModal}
        onClose={() => setShowCorrelationModal(false)}
        title="Corrélation IA des alertes"
        size="lg"
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            maxHeight: '72vh',
            overflowY: 'auto',
            paddingRight: '4px',
          }}
        >
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1.4fr repeat(3, 0.7fr)',
              gap: '12px',
              alignItems: 'stretch',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '12px',
                padding: '16px',
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border)',
                borderRadius: '14px',
              }}
            >
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: '12px',
                  background: 'var(--pink-bg)',
                  color: 'var(--pink)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <BrainCircuit size={19} />
              </div>

              <div>
                <h3 style={{ margin: 0, fontSize: '15px', color: 'var(--text-primary)', fontWeight: 800 }}>
                  Analyse AIOps du projet
                </h3>
                <p style={{ margin: '6px 0 0', fontSize: '12px', color: 'var(--text-subtle)', lineHeight: 1.6 }}>
                  L’IA compare les alertes visibles pour détecter les patterns communs : endpoint, API,
                  code HTTP, période, statut et sévérité.
                </p>
              </div>
            </div>

            {[
              { label: 'Alertes', value: alerts.length },
              { label: 'Ouvertes', value: correlationStats.open },
              { label: 'Critiques', value: correlationStats.critical || correlationStats.warning },
            ].map((item) => (
              <div
                key={item.label}
                style={{
                  padding: '16px',
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border)',
                  borderRadius: '14px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                }}
              >
                <span style={{ fontSize: '11px', color: 'var(--text-subtle)', fontWeight: 800, textTransform: 'uppercase' }}>
                  {item.label}
                </span>
                <strong style={{ marginTop: '8px', fontSize: '22px', color: 'var(--text-primary)' }}>
                  {item.value}
                </strong>
              </div>
            ))}
          </div>

          {correlationLoading && (
            <div
              style={{
                padding: '26px',
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                borderRadius: '14px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    border: '3px solid var(--border)',
                    borderTopColor: 'var(--pink)',
                    animation: 'spin 0.9s linear infinite',
                  }}
                />
                <div>
                  <p style={{ margin: 0, fontSize: '14px', fontWeight: 800, color: 'var(--text-primary)' }}>
                    Corrélation en cours
                  </p>
                  <p style={{ margin: '4px 0 0', fontSize: '12px', color: 'var(--text-subtle)' }}>
                    Ollama analyse les similarités entre les alertes du projet.
                  </p>
                </div>
              </div>

              {[1, 2, 3].map((item) => (
                <div
                  key={item}
                  className="skeleton"
                  style={{ height: '42px', borderRadius: '10px', marginTop: '10px' }}
                />
              ))}
            </div>
          )}

          {!correlationLoading && correlationError && (
            <div
              style={{
                padding: '16px',
                background: 'rgba(239, 68, 68, 0.08)',
                border: '1px solid rgba(239, 68, 68, 0.28)',
                borderRadius: '14px',
                color: '#ef4444',
                fontSize: '13px',
                lineHeight: 1.6,
              }}
            >
              {correlationError}
            </div>
          )}

          {!correlationLoading && correlationSections.length > 0 && (
            <div style={{ display: 'grid', gap: '12px' }}>
              {correlationSections.map((section, index) => (
                <div
                  key={`${section.title}-${index}`}
                  style={{
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border)',
                    borderRadius: '14px',
                    padding: '16px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                    <span
                      style={{
                        width: 26,
                        height: 26,
                        borderRadius: '8px',
                        background: 'var(--pink-bg)',
                        color: 'var(--pink)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '12px',
                        fontWeight: 900,
                      }}
                    >
                      {index + 1}
                    </span>
                    <h4 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '14px', fontWeight: 850 }}>
                      {section.title}
                    </h4>
                  </div>

                  <div
                    style={{
                      color: 'var(--text-muted)',
                      fontSize: '13px',
                      lineHeight: 1.75,
                      whiteSpace: 'pre-wrap',
                    }}
                  >
                    {section.body}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div
            style={{
              position: 'sticky',
              bottom: 0,
              display: 'flex',
              justifyContent: 'space-between',
              gap: '10px',
              paddingTop: '12px',
              background: 'var(--bg-primary)',
            }}
          >
            <span style={{ fontSize: '12px', color: 'var(--text-subtle)', alignSelf: 'center' }}>
              Analyse basée uniquement sur les alertes affichées du projet actif.
            </span>

            <div style={{ display: 'flex', gap: '10px' }}>
              <Button variant="secondary" onClick={() => setShowCorrelationModal(false)}>
                Fermer
              </Button>
              <Button
                icon={BrainCircuit}
                loading={correlationLoading}
                disabled={alerts.length < 2}
                onClick={handleCorrelateAlerts}
              >
                Régénérer
              </Button>
            </div>
          </div>
        </div>
      </Modal>
    </Layout>
  )
}