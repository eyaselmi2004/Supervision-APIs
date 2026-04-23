import React, { useEffect, useMemo, useState } from 'react'
import { Activity, TrendingUp, AlertCircle, CheckCircle, ExternalLink, Search } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Layout } from '../components/layout/Layout'
import { Header } from '../components/layout/Header'
import { Badge, MethodBadge } from '../components/ui/Badge'
import { apiServicesService } from '../services/apiServices.service'
import { metricsService } from '../services/metrics.service'
import type { ApiService, Endpoint, MetricsStats } from '../types'

const getStatus = (stats: MetricsStats | null) => {
  if (!stats || stats.total_requests === 0) return { label: 'Aucune donnée', variant: 'neutral' as const }
  if (stats.error_rate_percent > 10) return { label: 'Hors ligne', variant: 'critical' as const }
  if (stats.error_rate_percent > 2 || stats.avg_response_time_ms > 500) {
    return { label: 'Dégradé', variant: 'warning' as const }
  }
  return { label: 'En ligne', variant: 'success' as const }
}

const latencyColor = (ms: number) => {
  if (ms > 500) return '#f87171'
  if (ms > 200) return '#fbbf24'
  return '#34d399'
}

const getLast24h = () => {
  const end = new Date()
  const start = new Date()
  start.setDate(start.getDate() - 1)
  return { start: start.toISOString(), end: end.toISOString() }
}

const safeNumber = (value: unknown): number => {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : 0
  }
  return 0
}

const normalizeStats = (raw: any): MetricsStats | null => {
  if (!raw) return null

  const totalRequests = Math.max(0, Math.round(safeNumber(raw.total_requests)))
  const successCount = Math.max(0, Math.round(safeNumber(raw.success_count)))
  const errorCount = Math.max(0, Math.round(safeNumber(raw.error_count)))
  const avgResponse = safeNumber(raw.avg_response_time_ms ?? raw.avg_response_time)
  const minResponse = safeNumber(raw.min_response_time_ms)
  const maxResponse = safeNumber(raw.max_response_time_ms)
  const errorRate = safeNumber(raw.error_rate_percent ?? raw.error_rate)

  return {
    endpoint_id: raw.endpoint_id,
    period_start: raw.period_start,
    period_end: raw.period_end,
    total_requests: totalRequests,
    success_count: successCount,
    error_count: errorCount,
    avg_response_time_ms: avgResponse,
    min_response_time_ms: minResponse,
    max_response_time_ms: maxResponse,
    error_rate_percent: errorRate,
  }
}

interface EndpointRow {
  endpoint: Endpoint
  stats: MetricsStats | null
  serviceName: string
}

export const ApiServicesPage: React.FC = () => {
  const navigate = useNavigate()
  const [services, setServices] = useState<ApiService[]>([])
  const [rows, setRows] = useState<EndpointRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterMethod, setFilterMethod] = useState('ALL')
  const [filterStatus, setFilterStatus] = useState('ALL')

  useEffect(() => {
    let isMounted = true

    const load = async () => {
      setLoading(true)
      try {
        const servicesData = await apiServicesService.getAll()
        if (!isMounted) return
        setServices(servicesData)

        const { start, end } = getLast24h()

        const endpointGroups = await Promise.all(
          servicesData.map(async (service) => {
            try {
              const endpoints = await apiServicesService.getEndpoints(service.id)

              const endpointRows = await Promise.all(
                endpoints.map(async (endpoint) => {
                  try {
                    const rawStats = await metricsService.getStats(endpoint.id, start, end)
                    return {
                      endpoint,
                      serviceName: service.name,
                      stats: normalizeStats(rawStats),
                    } as EndpointRow
                  } catch {
                    return {
                      endpoint,
                      serviceName: service.name,
                      stats: null,
                    } as EndpointRow
                  }
                }),
              )

              return endpointRows
            } catch {
              return [] as EndpointRow[]
            }
          }),
        )

        if (!isMounted) return
        setRows(endpointGroups.flat())
      } catch (e) {
        console.error('Erreur chargement API services:', e)
        if (!isMounted) return
        setServices([])
        setRows([])
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    load()

    return () => {
      isMounted = false
    }
  }, [])

  const totalRequests = rows.reduce((s, r) => s + (r.stats?.total_requests ?? 0), 0)
  const totalErrors = rows.reduce((s, r) => s + (r.stats?.error_count ?? 0), 0)
  const healthyCount = rows.filter((r) => getStatus(r.stats).label === 'En ligne').length

  const filtered = useMemo(() => {
    return rows.filter((row) => {
      const status = getStatus(row.stats).label

      const matchesSearch =
        row.endpoint.path.toLowerCase().includes(search.toLowerCase()) ||
        row.serviceName.toLowerCase().includes(search.toLowerCase())

      const matchesMethod =
        filterMethod === 'ALL' || row.endpoint.method === filterMethod

      const matchesStatus =
        filterStatus === 'ALL' || status === filterStatus

      return matchesSearch && matchesMethod && matchesStatus
    })
  }, [rows, search, filterMethod, filterStatus])

  const inputStyle: React.CSSProperties = {
    padding: '8px 12px',
    background: 'var(--input-bg)',
    border: '1px solid var(--border)',
    borderRadius: '8px',
    color: 'var(--text-primary)',
    fontSize: '13px',
    outline: 'none',
    fontFamily: 'Sora, sans-serif',
  }

  return (
    <Layout>
      <Header
        title="API Services"
        subtitle="Liste réelle des endpoints supervisés"
        actions={
          <button
            onClick={() => window.location.reload()}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              background: 'transparent',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: 600,
            }}
          >
            <Activity size={14} />
            Refresh
          </button>
        }
      />

      <div style={{ padding: '24px' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '16px',
            marginBottom: '20px',
          }}
        >
          <div style={{ padding: '16px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px' }}>
            <p style={{ margin: 0, color: 'var(--text-subtle)', fontSize: '12px' }}>Services</p>
            <h3 style={{ margin: '8px 0 0 0' }}>{services.length}</h3>
          </div>
          <div style={{ padding: '16px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px' }}>
            <p style={{ margin: 0, color: 'var(--text-subtle)', fontSize: '12px' }}>Endpoints</p>
            <h3 style={{ margin: '8px 0 0 0' }}>{rows.length}</h3>
          </div>
          <div style={{ padding: '16px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px' }}>
            <p style={{ margin: 0, color: 'var(--text-subtle)', fontSize: '12px' }}>Healthy</p>
            <h3 style={{ margin: '8px 0 0 0' }}>
              {healthyCount}/{rows.length}
            </h3>
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            gap: '12px',
            marginBottom: '16px',
            padding: '16px',
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: '12px',
          }}
        >
          <div style={{ position: 'relative', flex: 1 }}>
            <Search
              size={14}
              style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-subtle)',
              }}
            />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher par service ou chemin"
              style={{ ...inputStyle, width: '100%', padding: '8px 12px 8px 36px', boxSizing: 'border-box' }}
            />
          </div>

          <select value={filterMethod} onChange={(e) => setFilterMethod(e.target.value)} style={inputStyle}>
            {['ALL', 'GET', 'POST', 'PUT', 'DELETE', 'PATCH'].map((m) => (
              <option key={m} value={m}>
                {m === 'ALL' ? 'Toutes les méthodes' : m}
              </option>
            ))}
          </select>

          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} style={inputStyle}>
            {['ALL', 'En ligne', 'Dégradé', 'Hors ligne', 'Aucune donnée'].map((s) => (
              <option key={s} value={s}>
                {s === 'ALL' ? 'Tous les statuts' : s}
              </option>
            ))}
          </select>
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
              display: 'grid',
              gridTemplateColumns: '2fr 100px 120px 130px 120px 60px',
              padding: '12px 20px',
              borderBottom: '1px solid var(--border)',
            }}
          >
            {["Nom de l'endpoint", 'Méthode', 'Latence (ms)', "Taux d'erreur (%)", 'Statut', 'Action'].map((h) => (
              <span
                key={h}
                style={{
                  fontSize: '11px',
                  fontWeight: 600,
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
            <div style={{ padding: '20px' }}>Chargement...</div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-subtle)', fontSize: '13px' }}>
              {rows.length === 0 ? 'Aucun endpoint détecté.' : 'Aucun résultat pour ces filtres.'}
            </div>
          ) : (
            filtered.map((row) => {
              const status = getStatus(row.stats)
              return (
                <div
                  key={row.endpoint.id}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '2fr 100px 120px 130px 120px 60px',
                    padding: '14px 20px',
                    borderBottom: '1px solid var(--border)',
                    alignItems: 'center',
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600 }}>{row.endpoint.path}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-subtle)' }}>{row.serviceName}</div>
                  </div>

                  <MethodBadge method={row.endpoint.method} />

                  <div style={{ color: latencyColor(row.stats?.avg_response_time_ms ?? 0), fontWeight: 600 }}>
                    {row.stats ? Math.round(row.stats.avg_response_time_ms) : '-'}
                  </div>

                  <div>{row.stats ? row.stats.error_rate_percent.toFixed(2) : '-'}%</div>

                  <Badge variant={status.variant}>{status.label}</Badge>

                  <button
                    onClick={() => navigate(`/metrics?service=${row.endpoint.api_service_id}&endpoint=${row.endpoint.id}`)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      color: 'var(--text-secondary)',
                    }}
                    title="Voir métriques"
                  >
                    <ExternalLink size={16} />
                  </button>
                </div>
              )
            })
          )}
        </div>

        <div style={{ display: 'flex', gap: '16px', marginTop: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <TrendingUp size={16} />
            <span>Total requests: {totalRequests}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertCircle size={16} />
            <span>Total errors: {totalErrors}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CheckCircle size={16} />
            <span>Healthy endpoints: {healthyCount}</span>
          </div>
        </div>
      </div>
    </Layout>
  )
}