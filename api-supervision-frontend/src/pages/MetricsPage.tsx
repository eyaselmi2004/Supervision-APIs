import React, { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import { Activity, AlertCircle, Clock, Gauge } from 'lucide-react'
import { Layout } from '../components/layout/Layout'
import { Header } from '../components/layout/Header'
import { apiServicesService } from '../services/apiServices.service'
import { metricsService } from '../services/metrics.service'
import { useProject } from '../contexts/ProjectContext'
import type { ApiService, Endpoint, MetricsStats, MetricsTimeSeries } from '../types'

type PeriodKey = '1h' | '6h' | '24h' | '7d'

type MetricsStatsExtended = MetricsStats & {
  avg_response_time?: number
  p95_latency_ms?: number
  p95_latency?: number
  error_rate?: number
}

type MetricsTimeSeriesExtended = MetricsTimeSeries & {
  error_rate_percent?: number
}

interface MetricsStatsView {
  total_requests: number
  success_count: number
  error_count: number
  avg_response_time_ms: number
  p95_latency_ms: number
  error_rate_percent: number
}

interface MetricsTimeSeriesView {
  bucket: string
  total_requests: number
  avg_response_time_ms: number
  error_count: number
  error_rate_percent: number
}

const PERIOD_LABELS: Record<PeriodKey, string> = {
  '1h': '1h',
  '6h': '6h',
  '24h': '24h',
  '7d': '7d',
}

const safeNumber = (value: unknown): number => {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : 0
  }
  return 0
}

const periodToHours = (period: PeriodKey): number => {
  const mapping: Record<PeriodKey, number> = {
    '1h': 1,
    '6h': 6,
    '24h': 24,
    '7d': 24 * 7,
  }
  return mapping[period]
}

const getPeriodRange = (period: PeriodKey): { start: string; end: string } => {
  const end = new Date()
  const start = new Date(end)
  start.setHours(start.getHours() - periodToHours(period))
  return { start: start.toISOString(), end: end.toISOString() }
}

const defaultBucketForPeriod = (period: PeriodKey): string => {
  if (period === '1h') return '5 minutes'
  if (period === '6h') return '15 minutes'
  if (period === '7d') return '1 day'
  return '1 hour'
}

const formatBucketLabel = (iso: string, period: PeriodKey): string => {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso

  if (period === '7d') {
    return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })
  }

  return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}

const normalizeStats = (raw: MetricsStats | null): MetricsStatsView | null => {
  if (!raw) return null

  const source = raw as MetricsStatsExtended
  const totalRequests = Math.max(0, Math.round(safeNumber(source.total_requests)))
  const successCount = Math.max(0, Math.round(safeNumber(source.success_count)))
  const errorCount = Math.max(0, Math.round(safeNumber(source.error_count)))

  const avgResponse = safeNumber(source.avg_response_time_ms ?? source.avg_response_time)
  const p95Latency = safeNumber(source.p95_latency_ms ?? source.p95_latency ?? avgResponse)
  const errorRate = safeNumber(source.error_rate_percent ?? source.error_rate)

  return {
    total_requests: totalRequests,
    success_count: successCount,
    error_count: errorCount,
    avg_response_time_ms: avgResponse,
    p95_latency_ms: p95Latency,
    error_rate_percent: errorRate,
  }
}

const normalizeTimeSeries = (rows: MetricsTimeSeries[]): MetricsTimeSeriesView[] => {
  return rows.map((row) => {
    const source = row as MetricsTimeSeriesExtended
    const totalRequests = Math.max(0, Math.round(safeNumber(source.total_requests)))
    const errorCount = Math.max(0, Math.round(safeNumber(source.error_count)))

    const computedErrorRate =
      totalRequests > 0
        ? (errorCount / totalRequests) * 100
        : safeNumber(source.error_rate_percent)

    return {
      bucket: source.bucket,
      total_requests: totalRequests,
      avg_response_time_ms: safeNumber(source.avg_response_time_ms),
      error_count: errorCount,
      error_rate_percent: computedErrorRate,
    }
  })
}

export const MetricsPage: React.FC = () => {
  const [searchParams] = useSearchParams()
  const { selectedProject } = useProject()

  const [services, setServices] = useState<ApiService[]>([])
  const [endpoints, setEndpoints] = useState<Endpoint[]>([])

  const [selectedService, setSelectedService] = useState<string>('')
  const [selectedEndpoint, setSelectedEndpoint] = useState<string>('')
  const [period, setPeriod] = useState<PeriodKey>('24h')
  const [bucketInterval, setBucketInterval] = useState<string>(defaultBucketForPeriod('24h'))

  const [stats, setStats] = useState<MetricsStatsView | null>(null)
  const [timeSeries, setTimeSeries] = useState<MetricsTimeSeriesView[]>([])

  const [servicesLoading, setServicesLoading] = useState<boolean>(true)
  const [endpointsLoading, setEndpointsLoading] = useState<boolean>(false)
  const [metricsLoading, setMetricsLoading] = useState<boolean>(false)

  const [metricsError, setMetricsError] = useState<string | null>(null)

  useEffect(() => {
    setBucketInterval(defaultBucketForPeriod(period))
  }, [period])

  useEffect(() => {
    let isMounted = true

    const loadServices = async () => {
      setServicesLoading(true)
      try {
        const fetchedServices = selectedProject?.id
          ? await apiServicesService.getByProject(selectedProject.id)
          : await apiServicesService.getAll()

        if (!isMounted) return

        setServices(fetchedServices)

        const serviceFromUrl = searchParams.get('service')
        const defaultServiceId =
          serviceFromUrl && fetchedServices.some((svc) => svc.id === serviceFromUrl)
            ? serviceFromUrl
            : fetchedServices[0]?.id ?? ''

        setSelectedService(defaultServiceId)
      } catch (error) {
        console.error('❌ Erreur chargement services:', error)
        if (!isMounted) return
        setServices([])
        setSelectedService('')
      } finally {
        if (isMounted) setServicesLoading(false)
      }
    }

    loadServices()

    return () => {
      isMounted = false
    }
  }, [searchParams, selectedProject?.id])

  useEffect(() => {
    let isMounted = true

    const loadEndpoints = async () => {
      setSelectedEndpoint('')
      setEndpoints([])
      setStats(null)
      setTimeSeries([])
      setMetricsError(null)

      if (!selectedService) {
        return
      }

      setEndpointsLoading(true)
      try {
        const fetchedEndpoints = await apiServicesService.getEndpoints(selectedService)
        if (!isMounted) return

        setEndpoints(fetchedEndpoints)

        const endpointFromUrl = searchParams.get('endpoint')
        setSelectedEndpoint(() => {
          if (endpointFromUrl && fetchedEndpoints.some((ep) => ep.id === endpointFromUrl)) {
            return endpointFromUrl
          }
          return fetchedEndpoints[0]?.id ?? ''
        })
      } catch (error) {
        console.error('❌ Erreur chargement endpoints:', error)
        if (!isMounted) return
        setEndpoints([])
        setSelectedEndpoint('')
      } finally {
        if (isMounted) setEndpointsLoading(false)
      }
    }

    loadEndpoints()

    return () => {
      isMounted = false
    }
  }, [selectedService, searchParams])

  useEffect(() => {
    let isMounted = true

    const loadMetrics = async () => {
      if (!selectedEndpoint) {
        setStats(null)
        setTimeSeries([])
        setMetricsError(null)
        return
      }

      setMetricsLoading(true)
      setMetricsError(null)

      try {
        const { start, end } = getPeriodRange(period)

        const [statsResponse, seriesResponse] = await Promise.all([
          metricsService.getStats(selectedEndpoint, start, end),
          metricsService.getTimeSeries(selectedEndpoint, start, end, bucketInterval),
        ])

        if (!isMounted) return

        setStats(normalizeStats(statsResponse))
        setTimeSeries(normalizeTimeSeries(seriesResponse))
      } catch (error) {
        if (!isMounted) return

        setStats(null)
        setTimeSeries([])

        const errorMessage =
          error instanceof Error
            ? error.message
            : 'Impossible de charger les metriques pour cet endpoint'

        setMetricsError(errorMessage)
      } finally {
        if (isMounted) setMetricsLoading(false)
      }
    }

    loadMetrics()

    return () => {
      isMounted = false
    }
  }, [selectedEndpoint, period, bucketInterval])

  const chartData = useMemo(
    () =>
      timeSeries.map((point) => ({
        time: formatBucketLabel(point.bucket, period),
        response_time: Number(point.avg_response_time_ms.toFixed(2)),
        error_rate: Number(point.error_rate_percent.toFixed(2)),
        total_requests: point.total_requests,
        error_count: point.error_count,
      })),
    [timeSeries, period],
  )

  const hasData = chartData.length > 0

  const selectStyle: React.CSSProperties = {
    padding: '8px 12px',
    background: 'var(--input-bg)',
    border: '1px solid var(--border)',
    borderRadius: '8px',
    color: 'var(--text-primary)',
    fontSize: '13px',
    outline: 'none',
    fontFamily: 'Sora, sans-serif',
    cursor: 'pointer',
  }

  const labelStyle: React.CSSProperties = {
    fontSize: '11px',
    color: 'var(--text-muted)',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  }

  const statValues = {
    avg: stats?.avg_response_time_ms ?? 0,
    p95: stats?.p95_latency_ms ?? 0,
    errorRate: stats?.error_rate_percent ?? 0,
    total: stats?.total_requests ?? 0,
  }

  return (
    <Layout>
      <Header title="Metriques" subtitle="Analyse des performances par endpoint" />

      <div style={{ padding: '24px 32px' }}>
        <div
          style={{
            display: 'flex',
            gap: '12px',
            marginBottom: '24px',
            padding: '16px',
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: '12px',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: '220px' }}>
            <label style={labelStyle}>API Service</label>
            <select
              value={selectedService}
              onChange={(event) => setSelectedService(event.target.value)}
              style={selectStyle}
              disabled={servicesLoading || services.length === 0}
            >
              {servicesLoading && <option>Chargement...</option>}
              {!servicesLoading && services.length === 0 && <option value="">Aucune API</option>}
              {!servicesLoading &&
                services.map((service) => (
                  <option key={service.id} value={service.id}>
                    {service.name}
                  </option>
                ))}
            </select>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: '280px' }}>
            <label style={labelStyle}>Endpoint</label>
            <select
              value={selectedEndpoint}
              onChange={(event) => setSelectedEndpoint(event.target.value)}
              style={selectStyle}
              disabled={endpointsLoading || endpoints.length === 0}
            >
              {endpointsLoading && <option>Chargement...</option>}
              {!endpointsLoading && endpoints.length === 0 && <option value="">Aucun endpoint</option>}
              {!endpointsLoading &&
                endpoints.map((endpoint) => (
                  <option key={endpoint.id} value={endpoint.id}>
                    {endpoint.method} {endpoint.path}
                  </option>
                ))}
            </select>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={labelStyle}>Periode</label>
            <div style={{ display: 'flex', gap: '4px' }}>
              {(Object.keys(PERIOD_LABELS) as PeriodKey[]).map((periodOption) => (
                <button
                  key={periodOption}
                  onClick={() => setPeriod(periodOption)}
                  style={{
                    padding: '8px 14px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: 500,
                    cursor: 'pointer',
                    border: 'none',
                    fontFamily: 'Sora, sans-serif',
                    background: period === periodOption ? '#d946ef' : 'var(--input-bg)',
                    color: period === periodOption ? '#fff' : 'var(--text-muted)',
                  }}
                >
                  {PERIOD_LABELS[periodOption]}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={labelStyle}>Bucket</label>
            <select
              value={bucketInterval}
              onChange={(event) => setBucketInterval(event.target.value)}
              style={selectStyle}
            >
              <option value="1 minute">1 minute</option>
              <option value="5 minutes">5 minutes</option>
              <option value="15 minutes">15 minutes</option>
              <option value="1 hour">1 heure</option>
              <option value="1 day">1 jour</option>
            </select>
          </div>
        </div>

        {metricsError && (
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
            <AlertCircle size={14} />
            {metricsError}
          </div>
        )}

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '16px',
            marginBottom: '24px',
          }}
        >
          <StatMini label="Latence moyenne" value={`${statValues.avg.toFixed(2)} ms`} icon={Clock} color="#e879f9" loading={metricsLoading} />
          <StatMini label="Latence P95" value={`${statValues.p95.toFixed(2)} ms`} icon={Gauge} color="#8B5CF6" loading={metricsLoading} />
          <StatMini label="Taux d'erreur" value={`${statValues.errorRate.toFixed(2)} %`} icon={AlertCircle} color={statValues.errorRate > 5 ? '#ef4444' : '#10b981'} loading={metricsLoading} />
          <StatMini label="Total requetes" value={statValues.total.toLocaleString('fr-FR')} icon={Activity} color="#10b981" loading={metricsLoading} />
        </div>

        <div
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: '12px',
            padding: '20px',
            marginBottom: '20px',
          }}
        >
          <p style={{ margin: '0 0 16px', fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
            Evolution du temps de reponse (ms)
          </p>

          {metricsLoading ? (
            <div className="skeleton" style={{ height: '240px', borderRadius: '8px' }} />
          ) : !selectedEndpoint ? (
            <div style={{ height: '240px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-subtle)', fontSize: '13px' }}>
              Selectionnez un endpoint
            </div>
          ) : !hasData ? (
            <div style={{ height: '240px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-subtle)', fontSize: '13px' }}>
              Aucune donnee pour cette periode
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="time" tick={{ fill: 'var(--text-subtle)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'var(--text-subtle)', fontSize: 11 }} axisLine={false} tickLine={false} unit="ms" />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: '12px', color: 'var(--text-muted)' }} />
                <Line type="monotone" dataKey="response_time" name="Temps de reponse" stroke="#d946ef" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        <div
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: '12px',
            padding: '20px',
          }}
        >
          <p style={{ margin: '0 0 16px', fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
            Evolution du taux d'erreur (%)
          </p>

          {metricsLoading ? (
            <div className="skeleton" style={{ height: '240px', borderRadius: '8px' }} />
          ) : !selectedEndpoint ? (
            <div style={{ height: '240px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-subtle)', fontSize: '13px' }}>
              Selectionnez un endpoint
            </div>
          ) : !hasData ? (
            <div style={{ height: '240px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-subtle)', fontSize: '13px' }}>
              Aucune donnee pour cette periode
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="time" tick={{ fill: 'var(--text-subtle)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'var(--text-subtle)', fontSize: 11 }} axisLine={false} tickLine={false} unit="%" />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: '12px', color: 'var(--text-muted)' }} />
                <Bar dataKey="error_rate" name="Taux d'erreur" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </Layout>
  )
}

interface StatMiniProps {
  label: string
  value: string
  icon: React.ElementType
  color: string
  loading: boolean
}

const StatMini: React.FC<StatMiniProps> = ({ label, value, icon: Icon, color, loading }) => (
  <div
    style={{
      background: 'var(--bg-card)',
      border: '1px solid var(--border)',
      borderRadius: '12px',
      padding: '16px',
    }}
  >
    {loading ? (
      <>
        <div className="skeleton" style={{ height: '12px', width: '100px', marginBottom: '10px' }} />
        <div className="skeleton" style={{ height: '24px', width: '120px' }} />
      </>
    ) : (
      <>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 500 }}>{label}</span>
          <Icon size={14} color={color} />
        </div>
        <p
          style={{
            margin: 0,
            fontSize: '20px',
            fontWeight: 700,
            color: 'var(--text-primary)',
            fontFamily: 'monospace',
          }}
        >
          {value}
        </p>
      </>
    )}
  </div>
)