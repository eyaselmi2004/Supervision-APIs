/**
 * metrics.service.ts — Appels API métriques TimescaleDB
 */
import api from './api'
import type { ApiMetric, MetricsStats, MetricsTimeSeries } from '../types'

export const metricsService = {

  // Métriques brutes d'un endpoint
  async getByEndpoint(endpointId: string, limit = 100): Promise<ApiMetric[]> {
    const res = await api.get<ApiMetric[]>(`/metrics/endpoint/${endpointId}`, {
      params: { limit },
    })
    return res.data
  },

  // Statistiques agrégées sur une période
  async getStats(
    endpointId: string,
    periodStart: string,
    periodEnd: string
  ): Promise<MetricsStats> {
    const res = await api.get<MetricsStats>(
      `/metrics/endpoint/${endpointId}/stats`,
      { params: { period_start: periodStart, period_end: periodEnd } }
    )
    return res.data
  },

  // Série temporelle pour les graphiques Recharts
  async getTimeSeries(
    endpointId: string,
    periodStart: string,
    periodEnd: string,
    bucketInterval = '1 hour'
  ): Promise<MetricsTimeSeries[]> {
    const res = await api.get<MetricsTimeSeries[]>(
      `/metrics/endpoint/${endpointId}/time-series`,
      { params: { period_start: periodStart, period_end: periodEnd, bucket_interval: bucketInterval } }
    )
    return res.data
  },
}