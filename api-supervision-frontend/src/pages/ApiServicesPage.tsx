import React, { useEffect, useMemo, useState } from 'react'
import {
  Activity,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  ExternalLink,
  Search,
  Plus,
  RefreshCw,
  Wand2,
  X,
} from 'lucide-react'
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

interface CreateApiForm {
  name: string
  base_url: string
  project_id: string
  is_active: boolean
}

const emptyCreateForm: CreateApiForm = {
  name: '',
  base_url: '',
  project_id: '',
  is_active: true,
}

export const ApiServicesPage: React.FC = () => {
  const navigate = useNavigate()
  const [services, setServices] = useState<ApiService[]>([])
  const [rows, setRows] = useState<EndpointRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterMethod, setFilterMethod] = useState('ALL')
  const [filterStatus, setFilterStatus] = useState('ALL')

  const [showCreateModal, setShowCreateModal] = useState(false)
  const [createForm, setCreateForm] = useState<CreateApiForm>(emptyCreateForm)
  const [createLoading, setCreateLoading] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const [actionMessage, setActionMessage] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    try {
      const servicesData = await apiServicesService.getAll()
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

      setRows(endpointGroups.flat())
    } catch (e) {
      console.error('Erreur chargement API services:', e)
      setServices([])
      setRows([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
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

  const modalInputStyle: React.CSSProperties = {
    padding: '12px 14px',
    background: 'var(--input-bg)',
    border: '1px solid var(--border)',
    borderRadius: '10px',
    color: 'var(--text-primary)',
    fontSize: '14px',
    outline: 'none',
    fontFamily: 'Sora, sans-serif',
    width: '100%',
    boxSizing: 'border-box',
  }

  const resetCreateForm = () => {
    setCreateForm(emptyCreateForm)
    setCreateError(null)
  }

  const openCreateModal = () => {
    resetCreateForm()
    setShowCreateModal(true)
  }

  const closeCreateModal = () => {
    setShowCreateModal(false)
    resetCreateForm()
  }

  const handleCreateApi = async (discoverAfterCreate = false) => {
    if (!createForm.name.trim()) {
      setCreateError('Veuillez saisir un nom d’API.')
      return
    }

    if (!createForm.base_url.trim()) {
      setCreateError('Veuillez saisir une base URL.')
      return
    }

    setCreateLoading(true)
    setCreateError(null)
    setActionMessage(null)

    try {
      const created = await apiServicesService.create({
        name: createForm.name.trim(),
        base_url: createForm.base_url.trim(),
        is_active: createForm.is_active,
        project_id: createForm.project_id.trim() ? createForm.project_id.trim() : null,
      })

      if (discoverAfterCreate) {
        const discovery = await apiServicesService.discoverEndpoints(created.id)
        setActionMessage(
          `API créée avec succès. ${discovery.created} endpoint(s) ajouté(s) automatiquement.`
        )
      } else {
        setActionMessage('API créée avec succès.')
      }

      await load()
      closeCreateModal()
    } catch (error: any) {
      console.error('Erreur création API:', error)
      setCreateError(error?.response?.data?.detail ?? 'Impossible de créer cette API.')
    } finally {
      setCreateLoading(false)
    }
  }

  return (
    <Layout>
      <Header
        title="API Services"
        subtitle="Liste réelle des endpoints supervisés"
        actions={
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={openCreateModal}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 14px',
                background: '#d946ef',
                border: 'none',
                borderRadius: '8px',
                color: '#fff',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: 700,
              }}
            >
              <Plus size={14} />
              Add API
            </button>

            <button
              onClick={load}
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
          </div>
        }
      />

      <div style={{ padding: '24px' }}>
        {actionMessage && (
          <div
            style={{
              marginBottom: '16px',
              padding: '12px 14px',
              borderRadius: '10px',
              border: '1px solid var(--border)',
              background: 'var(--bg-card)',
              color: 'var(--text-primary)',
              fontSize: '14px',
            }}
          >
            {actionMessage}
          </div>
        )}

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

      {showCreateModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.55)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '20px',
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '520px',
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: '18px',
              padding: '22px',
              boxShadow: '0 20px 50px rgba(0,0,0,0.25)',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '18px',
              }}
            >
              <div>
                <h3 style={{ margin: 0, color: 'var(--text-primary)' }}>Add API</h3>
                <p style={{ margin: '6px 0 0 0', color: 'var(--text-secondary)', fontSize: '14px' }}>
                  Create a monitored API directly from the interface.
                </p>
              </div>

              <button
                type="button"
                onClick={closeCreateModal}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                  API name
                </label>
                <input
                  type="text"
                  value={createForm.name}
                  onChange={(e) => setCreateForm((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="Full Stack FastAPI"
                  style={modalInputStyle}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                  Base URL
                </label>
                <input
                  type="text"
                  value={createForm.base_url}
                  onChange={(e) => setCreateForm((prev) => ({ ...prev, base_url: e.target.value }))}
                  placeholder="http://localhost:8001"
                  style={modalInputStyle}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                  Project ID (optional)
                </label>
                <input
                  type="text"
                  value={createForm.project_id}
                  onChange={(e) => setCreateForm((prev) => ({ ...prev, project_id: e.target.value }))}
                  placeholder="Leave empty for now"
                  style={modalInputStyle}
                />
              </div>

              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  color: 'var(--text-primary)',
                  fontSize: '14px',
                  cursor: 'pointer',
                }}
              >
                <input
                  type="checkbox"
                  checked={createForm.is_active}
                  onChange={(e) => setCreateForm((prev) => ({ ...prev, is_active: e.target.checked }))}
                />
                API active
              </label>

              {createError && (
                <div
                  style={{
                    padding: '10px 12px',
                    borderRadius: '10px',
                    background: 'rgba(239,68,68,0.08)',
                    border: '1px solid rgba(239,68,68,0.25)',
                    color: '#fca5a5',
                    fontSize: '13px',
                  }}
                >
                  {createError}
                </div>
              )}

              <div style={{ display: 'flex', gap: '10px', marginTop: '6px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => handleCreateApi(false)}
                  disabled={createLoading}
                  style={{
                    flex: 1,
                    minWidth: '180px',
                    padding: '12px 16px',
                    borderRadius: '10px',
                    border: '1px solid var(--border)',
                    background: 'var(--bg-elevated)',
                    color: 'var(--text-primary)',
                    fontWeight: 700,
                    cursor: createLoading ? 'not-allowed' : 'pointer',
                    opacity: createLoading ? 0.7 : 1,
                  }}
                >
                  {createLoading ? 'Creating...' : 'Create API'}
                </button>

                <button
                  type="button"
                  onClick={() => handleCreateApi(true)}
                  disabled={createLoading}
                  style={{
                    flex: 1,
                    minWidth: '180px',
                    padding: '12px 16px',
                    borderRadius: '10px',
                    border: 'none',
                    background: '#d946ef',
                    color: '#fff',
                    fontWeight: 700,
                    cursor: createLoading ? 'not-allowed' : 'pointer',
                    opacity: createLoading ? 0.7 : 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                  }}
                >
                  {createLoading ? <RefreshCw size={16} /> : <Wand2 size={16} />}
                  {createLoading ? 'Processing...' : 'Create + Discover'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}