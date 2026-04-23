/**
 * alerts.service.ts — Appels API alertes et règles de surveillance
 */
import api from './api'
import type { Alert, AlertRule, AlertRuleCreate, MessageResponse } from '../types'

export const alertsService = {

  async getRules(): Promise<AlertRule[]> {
    const res = await api.get<AlertRule[]>('/alert-rules')
    return res.data
  },

  async createRule(data: AlertRuleCreate): Promise<AlertRule> {
    const res = await api.post<AlertRule>('/alert-rules', data)
    return res.data
  },

  async updateRule(id: string, data: Partial<AlertRuleCreate>): Promise<AlertRule> {
    const res = await api.put<AlertRule>(`/alert-rules/${id}`, data)
    return res.data
  },

  async deleteRule(id: string): Promise<MessageResponse> {
    const res = await api.delete<MessageResponse>(`/alert-rules/${id}`)
    return res.data
  },

  async getAll(status?: string, limit = 50): Promise<Alert[]> {
    const res = await api.get<Alert[]>('/alerts', { params: { status, limit } })
    return res.data
  },

  async acknowledge(id: string, userId: string): Promise<Alert> {
    const res = await api.post<Alert>(`/alerts/${id}/acknowledge`, { user_id: userId })
    return res.data
  },

  async resolve(id: string): Promise<Alert> {
    const res = await api.post<Alert>(`/alerts/${id}/resolve`)
    return res.data
  },
}