/**
 * apiServices.service.ts — Appels API pour les services et endpoints
 */
import api from './api'
import type { ApiService, ApiServiceCreate, Endpoint, EndpointCreate, MessageResponse } from '../types'

export const apiServicesService = {

  async getAll(): Promise<ApiService[]> {
    const res = await api.get<ApiService[]>('/api-services')
    return res.data
  },

  async getById(id: string): Promise<ApiService> {
    const res = await api.get<ApiService>(`/api-services/${id}`)
    return res.data
  },

  async create(data: ApiServiceCreate): Promise<ApiService> {
    const res = await api.post<ApiService>('/api-services', data)
    return res.data
  },

  async update(id: string, data: Partial<ApiServiceCreate>): Promise<ApiService> {
    const res = await api.put<ApiService>(`/api-services/${id}`, data)
    return res.data
  },

  async delete(id: string): Promise<MessageResponse> {
    const res = await api.delete<MessageResponse>(`/api-services/${id}`)
    return res.data
  },

  async getEndpoints(serviceId: string): Promise<Endpoint[]> {
    const res = await api.get<Endpoint[]>(`/api-services/${serviceId}/endpoints`)
    return res.data
  },

  async createEndpoint(serviceId: string, data: EndpointCreate): Promise<Endpoint> {
    const res = await api.post<Endpoint>(`/api-services/${serviceId}/endpoints`, data)
    return res.data
  },

  async getByProject(projectId: string) {
  const response = await api.get<ApiService[]>(`/api-services?project_id=${projectId}`)
  return response.data
}
}