import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Globe,
  AlertTriangle,
  Shield,
  Activity,
  CheckCircle,
  TrendingUp,
  TrendingDown,
  ChevronRight,
  Gauge,
  Clock,
  FolderOpen,
} from 'lucide-react'
import { Layout } from '../components/layout/Layout'
import { Header } from '../components/layout/Header'
import { useAuth } from '../hooks/useAuth'
import { useProject } from '../contexts/ProjectContext'
import { AlertSeverityBadge, MethodBadge } from '../components/ui/Badge'
import { StatusBadgeWithDot } from '../components/ui/StatusIndicator'
import api from '../services/api'
import { apiServicesService } from '../services/apiServices.service'
import { metricsService } from '../services/metrics.service'
import type { ApiService, Endpoint, MetricsStats } from '../types'

type AlertFilter = 'all' | 'open' | 'acknowledged' | 'resolved'

type MetricsStatsExtended = MetricsStats & {
  avg_response_time?: number
  error_rate?: number
}

interface DashboardStats {
  monitored_apis: number
  active_alerts: number
  total_requests_24h: number
  global_health_score: number
}

interface DashboardAlert {
  id: string
  message: string
  severity: 'INFO' | 'WARNING' | 'CRITICAL' | string
  status: string
  created_at: string
}

interface DashboardIncident {
  id: string
  api_service_id: string
  title: string
  status: string
  start_time: string
  end_time?: string | null
}

interface LiveActivityItem {
  id: string
  type: 'alert' | 'incident'
  title: string
  subtitle: string
  status: string
  date: string
  color: string
}

interface EndpointMetricsRow {
  endpoint_id: string
  api_service_id: string
  service_name: string
  path: string
  method: string
  avg_response_time_ms: number
  error_rate_percent: number
  total_requests: number
  error_count: number
}

const safeNumber = (value: unknown): number => {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : 0
  }
  return 0
}

const getLast24hRange = (): { start: string; end: string } => {
  const end = new Date()
  const start = new Date(end)
  start.setHours(start.getHours() - 24)
  return { start: start.toISOString(), end: end.toISOString() }
}

const normalizeMetricsStats = (raw: MetricsStats) => {
  const source = raw as MetricsStatsExtended

  return {
    total_requests: Math.max(0, Math.round(safeNumber(source.total_requests))),
    error_count: Math.max(0, Math.round(safeNumber(source.error_count))),
    avg_response_time_ms: safeNumber(source.avg_response_time_ms ?? source.avg_response_time),
    error_rate_percent: safeNumber(source.error_rate_percent ?? source.error_rate),
  }
}

const calculateHealthScore = (
  errorRatePercent: number,
  avgLatencyMs: number,
  activeAlerts: number,
): number => {
  const errorPenalty = Math.min(60, errorRatePercent * 2.5)
  const latencyPenalty = Math.min(25, avgLatencyMs / 120)
  const alertPenalty = Math.min(25, activeAlerts * 3)

  const score = 100 - errorPenalty - latencyPenalty - alertPenalty
  return Math.max(0, Math.min(100, Number(score.toFixed(1))))
}

const mapStatusToBadge = (status: string): 'open' | 'in-progress' | 'resolved' => {
  if (status === 'OPEN') return 'open'
  if (status === 'ACKNOWLEDGED') return 'in-progress'
  return 'resolved'
}

const formatAlertTime = (iso: string): string => {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso

  return date.toLocaleString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { selectedProject } = useProject()

  const [stats, setStats] = useState<DashboardStats>({
    monitored_apis: 0,
    active_alerts: 0,
    total_requests_24h: 0,
    global_health_score: 0,
  })

  const [alerts, setAlerts] = useState<DashboardAlert[]>([])
  const [liveActivities, setLiveActivities] = useState<LiveActivityItem[]>([])
  const [slowEndpoints, setSlowEndpoints] = useState<EndpointMetricsRow[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [alertFilter, setAlertFilter] = useState<AlertFilter>('all')
  const [dashboardError, setDashboardError] = useState<string | null>(null)

  useEffect(() => {
    loadDashboard()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProject?.id])

  const resetDashboard = () => {
    setStats({
      monitored_apis: 0,
      active_alerts: 0,
      total_requests_24h: 0,
      global_health_score: 0,
    })
    setAlerts([])
    setLiveActivities([])
    setSlowEndpoints([])
  }

  const loadDashboard = async () => {
    setLoading(true)
    setDashboardError(null)

    if (!selectedProject?.id) {
      resetDashboard()
      setLoading(false)
      return
    }

    try {
      const servicesResponse = await apiServicesService.getByProject(selectedProject.id)
      const services = (Array.isArray(servicesResponse) ? servicesResponse : []) as ApiService[]
      const serviceIds = new Set(services.map((service) => service.id))

      const alertsResponse = await api.get<DashboardAlert[]>('/alerts', {
        params: {
          project_id: selectedProject.id,
          limit: 100,
        },
      })

      const incidentsResponse = await api.get<DashboardIncident[]>('/incidents')

      const alertsData = Array.isArray(alertsResponse.data) ? alertsResponse.data : []

      const incidentsData = Array.isArray(incidentsResponse.data)
        ? incidentsResponse.data.filter((incident) => serviceIds.has(incident.api_service_id))
        : []

      const endpointGroups = await Promise.all(
        services.map(async (service) => {
          try {
            const endpoints = await apiServicesService.getEndpoints(service.id)
            return endpoints.map((endpoint) => ({ endpoint, serviceName: service.name }))
          } catch {
            return [] as Array<{ endpoint: Endpoint; serviceName: string }>
          }
        }),
      )

      const endpointsFlat = endpointGroups.flat()
      const { start, end } = getLast24hRange()

      const endpointMetrics = await Promise.all(
        endpointsFlat.map(async ({ endpoint, serviceName }) => {
          try {
            const rawStats = await metricsService.getStats(endpoint.id, start, end)
            const normalized = normalizeMetricsStats(rawStats)

            return {
              endpoint_id: endpoint.id,
              api_service_id: endpoint.api_service_id,
              service_name: serviceName,
              path: endpoint.path,
              method: endpoint.method,
              avg_response_time_ms: normalized.avg_response_time_ms,
              error_rate_percent: normalized.error_rate_percent,
              total_requests: normalized.total_requests,
              error_count: normalized.error_count,
            } as EndpointMetricsRow
          } catch {
            return {
              endpoint_id: endpoint.id,
              api_service_id: endpoint.api_service_id,
              service_name: serviceName,
              path: endpoint.path,
              method: endpoint.method,
              avg_response_time_ms: 0,
              error_rate_percent: 0,
              total_requests: 0,
              error_count: 0,
            } as EndpointMetricsRow
          }
        }),
      )

      const totalRequests = endpointMetrics.reduce((sum, row) => sum + row.total_requests, 0)
      const totalErrors = endpointMetrics.reduce((sum, row) => sum + row.error_count, 0)

      const weightedLatency =
        totalRequests > 0
          ? endpointMetrics.reduce(
              (sum, row) => sum + row.avg_response_time_ms * row.total_requests,
              0,
            ) / totalRequests
          : 0

      const activeAlerts = alertsData.filter((alert) => alert.status === 'OPEN').length
      const globalErrorRate = totalRequests > 0 ? (totalErrors / totalRequests) * 100 : 0
      const healthScore = calculateHealthScore(globalErrorRate, weightedLatency, activeAlerts)

      const sortedAlerts = [...alertsData].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      )

      const alertActivities: LiveActivityItem[] = sortedAlerts.slice(0, 5).map((alert) => ({
        id: `alert-${alert.id}`,
        type: 'alert',
        title: alert.status === 'RESOLVED' ? 'Alert resolved' : 'Alert opened',
        subtitle: alert.message || 'Alert without message',
        status: alert.status,
        date: alert.created_at,
        color: alert.severity === 'CRITICAL' ? '#ef4444' : '#f59e0b',
      }))

      const incidentActivities: LiveActivityItem[] = incidentsData.slice(0, 5).map((incident) => ({
        id: `incident-${incident.id}`,
        type: 'incident',
        title: incident.status === 'RESOLVED' ? 'Incident resolved' : 'Incident opened',
        subtitle: incident.title || 'Incident without title',
        status: incident.status,
        date: incident.end_time || incident.start_time,
        color: incident.status === 'RESOLVED' ? '#10b981' : '#ef4444',
      }))

      const activities = [...alertActivities, ...incidentActivities]
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 6)

      const topSlowest = endpointMetrics
        .filter((row) => row.total_requests > 0)
        .sort((a, b) => b.avg_response_time_ms - a.avg_response_time_ms)
        .slice(0, 5)

      setStats({
        monitored_apis: services.length,
        active_alerts: activeAlerts,
        total_requests_24h: totalRequests,
        global_health_score: healthScore,
      })

      setAlerts(sortedAlerts)
      setLiveActivities(activities)
      setSlowEndpoints(topSlowest)
    } catch (error) {
      resetDashboard()

      const message =
        error instanceof Error ? error.message : 'Impossible de charger les données du dashboard'

      setDashboardError(message)
    } finally {
      setLoading(false)
    }
  }

  const recentAlerts = useMemo(() => alerts.slice(0, 5), [alerts])

  const filteredRecentAlerts = useMemo(() => {
    return recentAlerts.filter((alert) => {
      if (alertFilter === 'all') return true
      if (alertFilter === 'open') return alert.status === 'OPEN'
      if (alertFilter === 'acknowledged') return alert.status === 'ACKNOWLEDGED'
      if (alertFilter === 'resolved') return alert.status === 'RESOLVED'
      return true
    })
  }, [recentAlerts, alertFilter])

  const alertCounts = {
    all: alerts.length,
    open: alerts.filter((alert) => alert.status === 'OPEN').length,
    acknowledged: alerts.filter((alert) => alert.status === 'ACKNOWLEDGED').length,
    resolved: alerts.filter((alert) => alert.status === 'RESOLVED').length,
  }

  const healthColor =
    stats.global_health_score >= 90
      ? '#10b981'
      : stats.global_health_score >= 70
        ? '#f59e0b'
        : '#ef4444'

  const CarteKpi = ({
    label,
    value,
    icon: Icon,
    color,
    bg,
    border,
    onClick,
    trend,
  }: {
    label: string
    value: number | string
    icon: React.ElementType
    color: string
    bg: string
    border: string
    onClick?: () => void
    trend?: 'up' | 'down' | null
  }) => (
    <div
      onClick={onClick}
      style={{
        background: 'var(--bg-card)',
        border: `1px solid ${border}`,
        borderRadius: '12px',
        padding: '20px 24px',
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'all 0.2s',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          width: '3px',
          background: color,
        }}
      />

      <div
        style={{
          width: '44px',
          height: '44px',
          borderRadius: '10px',
          background: bg,
          border: `1px solid ${border}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <Icon size={20} color={color} />
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <p
          style={{
            margin: 0,
            fontSize: '11px',
            fontWeight: 700,
            color: 'var(--text-subtle)',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            marginBottom: '4px',
          }}
        >
          {label}
        </p>

        <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
          <p
            style={{
              margin: 0,
              fontSize: '28px',
              fontWeight: 700,
              color: 'var(--text-primary)',
              fontFamily: 'monospace',
              lineHeight: 1,
            }}
          >
            {loading ? '-' : value}
          </p>

          {trend === 'up' && <TrendingUp size={14} color="#ef4444" />}
          {trend === 'down' && <TrendingDown size={14} color="#10b981" />}
        </div>
      </div>

      {onClick && <ChevronRight size={16} color="var(--text-subtle)" />}
    </div>
  )

  return (
    <Layout>
      <Header
        title="Dashboard"
        subtitle={
          selectedProject
            ? `Vue temps réel du projet : ${selectedProject.name}`
            : 'Sélectionnez un projet pour afficher son dashboard'
        }
        actions={
          selectedProject ? (
            <button
              onClick={loadDashboard}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-transparent border border-[var(--border)] rounded-md text-[var(--text-muted)] text-xs font-semibold cursor-pointer"
            >
              <Activity size={13} /> Refresh
            </button>
          ) : undefined
        }
      />

      <div className="p-7">
        {!selectedProject ? (
          <div
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: '16px',
              padding: '60px 24px',
              textAlign: 'center',
            }}
          >
            <FolderOpen size={42} color="var(--text-subtle)" style={{ marginBottom: '14px' }} />

            <h2 style={{ margin: 0, fontSize: '20px', color: 'var(--text-primary)' }}>
              Aucun projet sélectionné
            </h2>

            <p
              style={{
                margin: '10px auto 24px',
                maxWidth: '520px',
                color: 'var(--text-subtle)',
                fontSize: '14px',
                lineHeight: 1.7,
              }}
            >
              Ce dashboard affiche uniquement les métriques, alertes et incidents liés au projet
              dont vous faites partie. Sélectionnez un projet ou rejoignez une équipe.
            </p>

            <button
              onClick={() => navigate('/projects')}
              style={{
                padding: '10px 16px',
                borderRadius: '10px',
                border: '1px solid var(--border)',
                background: 'var(--pink-mid)',
                color: '#fff',
                fontWeight: 800,
                cursor: 'pointer',
              }}
            >
              Aller aux projets
            </button>
          </div>
        ) : (
          <>
            <div className="p-4 mb-6 bg-primary-500/10 border border-primary-500/20 rounded-lg">
              <p className="m-0 text-sm font-semibold text-primary-300">
                Welcome, {user?.name || 'User'}
              </p>
              <p className="m-0 mt-0.5 text-xs text-[var(--text-subtle)]">
                Projet actif : <span style={{ color: 'var(--pink)', fontWeight: 700 }}>{selectedProject.name}</span>
              </p>
            </div>

            {dashboardError && (
              <div
                style={{
                  marginBottom: '16px',
                  padding: '12px 14px',
                  borderRadius: '10px',
                  border: '1px solid rgba(239,68,68,0.25)',
                  background: 'rgba(239,68,68,0.08)',
                  color: '#fca5a5',
                  fontSize: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <AlertTriangle size={14} />
                {dashboardError}
              </div>
            )}

            <div className="grid grid-cols-4 gap-4 mb-7">
              <CarteKpi
                label="Global Health"
                value={`${stats.global_health_score.toFixed(1)}%`}
                icon={Shield}
                color={healthColor}
                bg="rgba(16,185,129,0.10)"
                border="rgba(16,185,129,0.2)"
                onClick={() => navigate('/metrics')}
                trend={stats.global_health_score >= 90 ? 'down' : 'up'}
              />

              <CarteKpi
                label="Active Alerts"
                value={stats.active_alerts}
                icon={AlertTriangle}
                color={stats.active_alerts > 0 ? '#ef4444' : '#10b981'}
                bg={stats.active_alerts > 0 ? 'rgba(239,68,68,0.08)' : 'rgba(16,185,129,0.08)'}
                border={stats.active_alerts > 0 ? 'rgba(239,68,68,0.15)' : 'rgba(16,185,129,0.15)'}
                onClick={() => navigate('/alerts')}
                trend={stats.active_alerts > 0 ? 'up' : null}
              />

              <CarteKpi
                label="Requests (24h)"
                value={stats.total_requests_24h.toLocaleString('fr-FR')}
                icon={Activity}
                color="#d946ef"
                bg="rgba(217,70,239,0.10)"
                border="rgba(217,70,239,0.2)"
                onClick={() => navigate('/metrics')}
              />

              <CarteKpi
                label="Monitored APIs"
                value={stats.monitored_apis}
                icon={Globe}
                color="#0369a1"
                bg="rgba(3,105,161,0.08)"
                border="rgba(3,105,161,0.15)"
                onClick={() => navigate(`/projects/${selectedProject.id}`)}
              />
            </div>

            <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl overflow-hidden mb-5">
              <div className="px-5 py-4 border-b border-[var(--border)] flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Clock size={16} color="var(--pink)" />
                  <div>
                    <p className="m-0 text-sm font-semibold text-[var(--text-primary)]">Live Activity</p>
                    <p className="m-0 text-xs text-[var(--text-subtle)]">Activité récente du projet</p>
                  </div>
                </div>

                <button
                  onClick={loadDashboard}
                  className="text-xs font-semibold text-primary-500 bg-transparent border-none cursor-pointer"
                >
                  Refresh
                </button>
              </div>

              {loading ? (
                <div style={{ padding: '16px' }}>
                  {[...Array(4)].map((_, index) => (
                    <div
                      key={index}
                      className="skeleton"
                      style={{ height: '46px', marginBottom: '8px', borderRadius: '8px' }}
                    />
                  ))}
                </div>
              ) : liveActivities.length === 0 ? (
                <div style={{ padding: '32px', textAlign: 'center' }}>
                  <CheckCircle size={24} color="#10b981" style={{ marginBottom: '8px' }} />
                  <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-subtle)' }}>
                    Aucune activité récente pour ce projet
                  </p>
                </div>
              ) : (
                <div style={{ padding: '8px 20px' }}>
                  {liveActivities.map((activity, index) => (
                    <div
                      key={activity.id}
                      onClick={() => navigate(activity.type === 'alert' ? '/alerts' : '/incidents')}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '28px 1fr 120px',
                        gap: '12px',
                        alignItems: 'center',
                        padding: '12px 0',
                        borderBottom: index < liveActivities.length - 1 ? '1px solid var(--border)' : 'none',
                        cursor: 'pointer',
                      }}
                    >
                      <div
                        style={{
                          width: '10px',
                          height: '10px',
                          borderRadius: '999px',
                          background: activity.color,
                          boxShadow: `0 0 0 4px ${activity.color}20`,
                          justifySelf: 'center',
                        }}
                      />

                      <div style={{ minWidth: 0 }}>
                        <p style={{ margin: 0, fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
                          {activity.title}
                        </p>
                        <p
                          style={{
                            margin: '3px 0 0',
                            fontSize: '12px',
                            color: 'var(--text-subtle)',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {activity.subtitle}
                        </p>
                      </div>

                      <span style={{ fontSize: '12px', color: 'var(--text-subtle)', textAlign: 'right' }}>
                        {formatAlertTime(activity.date)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl overflow-hidden mb-5">
              <div className="px-5 py-4 border-b border-[var(--border)] flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <AlertTriangle size={16} color="var(--pink)" />
                  <div>
                    <p className="m-0 text-sm font-semibold text-[var(--text-primary)]">Recent Alerts</p>
                    <p className="m-0 text-xs text-[var(--text-subtle)]">Dernières alertes du projet</p>
                  </div>
                </div>

                {[
                  { key: 'all' as const, label: 'All Alerts', count: alertCounts.all },
                  { key: 'open' as const, label: 'Open', count: alertCounts.open },
                  { key: 'acknowledged' as const, label: 'In Progress', count: alertCounts.acknowledged },
                  { key: 'resolved' as const, label: 'Resolved', count: alertCounts.resolved },
                ].map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setAlertFilter(tab.key)}
                    className={`flex items-center gap-1.5 px-3 py-2 bg-transparent border-none text-sm font-medium cursor-pointer ${
                      alertFilter === tab.key ? 'text-primary-500' : 'text-[var(--text-muted)]'
                    }`}
                  >
                    {tab.label}
                    <span>{tab.count}</span>
                  </button>
                ))}
              </div>

              <div>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '120px 1fr 120px 150px 90px',
                    padding: '12px 20px',
                    borderBottom: '1px solid var(--border)',
                    background: 'var(--bg-secondary)',
                  }}
                >
                  {['Severity', 'Message', 'Status', 'Date', 'Action'].map((header) => (
                    <span
                      key={header}
                      style={{
                        fontSize: '11px',
                        fontWeight: 600,
                        color: 'var(--text-subtle)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                      }}
                    >
                      {header}
                    </span>
                  ))}
                </div>

                {loading ? (
                  <div style={{ padding: '16px' }}>
                    {[...Array(5)].map((_, index) => (
                      <div
                        key={index}
                        className="skeleton"
                        style={{ height: '48px', marginBottom: '8px', borderRadius: '6px' }}
                      />
                    ))}
                  </div>
                ) : filteredRecentAlerts.length === 0 ? (
                  <div style={{ padding: '40px', textAlign: 'center' }}>
                    <CheckCircle size={24} color="#10b981" style={{ marginBottom: '8px' }} />
                    <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-subtle)' }}>
                      Aucune alerte pour ce projet
                    </p>
                  </div>
                ) : (
                  filteredRecentAlerts.map((alert, index) => (
                    <div
                      key={alert.id}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '120px 1fr 120px 150px 90px',
                        padding: '14px 20px',
                        borderBottom: index < filteredRecentAlerts.length - 1 ? '1px solid var(--border)' : 'none',
                        alignItems: 'center',
                        cursor: 'pointer',
                      }}
                      onClick={() => navigate('/alerts')}
                    >
                      <AlertSeverityBadge severity={alert.severity || 'INFO'} />

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
                        {alert.message || 'Alerte sans message'}
                      </p>

                      <StatusBadgeWithDot
                        status={mapStatusToBadge(alert.status || 'OPEN')}
                        animated={alert.status === 'OPEN'}
                      />

                      <span style={{ fontSize: '12px', color: 'var(--text-subtle)' }}>
                        {formatAlertTime(alert.created_at)}
                      </span>

                      <button
                        style={{
                          width: '36px',
                          height: '28px',
                          borderRadius: '6px',
                          border: '1px solid var(--border)',
                          background: 'transparent',
                          color: 'var(--text-subtle)',
                          cursor: 'pointer',
                        }}
                      >
                        <ChevronRight size={14} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

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
                  padding: '16px 20px',
                  borderBottom: '1px solid var(--border)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Gauge size={16} color="var(--pink)" />
                  <div>
                    <p style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                      Top 5 slowest endpoints
                    </p>
                    <p style={{ margin: 0, fontSize: '11px', color: 'var(--text-subtle)' }}>
                      Endpoints les plus lents du projet sur 24h
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => navigate('/metrics')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    background: 'none',
                    border: 'none',
                    color: 'var(--pink)',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  View metrics <ChevronRight size={13} />
                </button>
              </div>

              {loading ? (
                <div style={{ padding: '16px' }}>
                  {[...Array(5)].map((_, index) => (
                    <div
                      key={index}
                      className="skeleton"
                      style={{ height: '56px', marginBottom: '8px', borderRadius: '8px' }}
                    />
                  ))}
                </div>
              ) : slowEndpoints.length === 0 ? (
                <div style={{ padding: '40px', textAlign: 'center' }}>
                  <CheckCircle size={24} color="#10b981" style={{ marginBottom: '8px' }} />
                  <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-subtle)' }}>
                    Aucun endpoint avec trafic sur les 24 dernières heures
                  </p>
                </div>
              ) : (
                slowEndpoints.map((endpoint, index) => (
                  <div
                    key={endpoint.endpoint_id}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '110px 1fr 140px 110px 100px 70px',
                      padding: '14px 20px',
                      borderBottom: index < slowEndpoints.length - 1 ? '1px solid var(--border)' : 'none',
                      alignItems: 'center',
                      cursor: 'pointer',
                    }}
                    onClick={() => navigate(`/metrics?service=${endpoint.api_service_id}&endpoint=${endpoint.endpoint_id}`)}
                  >
                    <MethodBadge method={endpoint.method} />

                    <div style={{ minWidth: 0 }}>
                      <p
                        style={{
                          margin: 0,
                          fontSize: '13px',
                          color: 'var(--text-primary)',
                          fontWeight: 600,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {endpoint.path}
                      </p>

                      <p
                        style={{
                          margin: '2px 0 0',
                          fontSize: '11px',
                          color: 'var(--text-subtle)',
                        }}
                      >
                        {endpoint.service_name}
                      </p>
                    </div>

                    <span style={{ fontSize: '13px', fontWeight: 700, color: '#fbbf24', fontFamily: 'monospace' }}>
                      {endpoint.avg_response_time_ms.toFixed(2)} ms
                    </span>

                    <span
                      style={{
                        fontSize: '12px',
                        color: endpoint.error_rate_percent > 5 ? '#ef4444' : 'var(--text-muted)',
                        fontFamily: 'monospace',
                      }}
                    >
                      {endpoint.error_rate_percent.toFixed(2)}%
                    </span>

                    <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                      {endpoint.total_requests}
                    </span>

                    <ChevronRight size={14} color="var(--text-subtle)" />
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </div>
    </Layout>
  )
}