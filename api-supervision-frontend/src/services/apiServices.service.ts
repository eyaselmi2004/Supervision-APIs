import api from './api'
import type {
  ApiService,
  Endpoint,
  EndpointDiscoveryResult,
  EndpointTestResult,
} from '../types'


export interface MonitoredApiLoginResponse {
  access_token: string
  token_type: string
}
interface CreateApiServicePayload {
  name: string
  base_url: string
  is_active?: boolean
  project_id?: string | null
}

interface UpdateApiServicePayload {
  name?: string
  base_url?: string
  is_active?: boolean
  project_id?: string | null
}

interface CreateEndpointPayload {
  path: string
  method: string
  is_active?: boolean
}

interface EndpointTestPayload {
  headers?: Record<string, string>
  query_params?: Record<string, string>
  json_body?: unknown
}

export const apiServicesService = {
  getAll: async (): Promise<ApiService[]> => {
    const response = await api.get('/api-services')
    return response.data
  },

  getByProject: async (projectId: string): Promise<ApiService[]> => {
    const response = await api.get('/api-services', {
      params: { project_id: projectId },
    })
    return response.data
  },

  getById: async (serviceId: string): Promise<ApiService> => {
    const response = await api.get(`/api-services/${serviceId}`)
    return response.data
  },

  create: async (payload: CreateApiServicePayload): Promise<ApiService> => {
    const response = await api.post('/api-services', {
      name: payload.name,
      base_url: payload.base_url,
      is_active: payload.is_active ?? true,
      project_id: payload.project_id ?? null,
    })
    return response.data
  },

  update: async (
    serviceId: string,
    payload: UpdateApiServicePayload
  ): Promise<ApiService> => {
    const response = await api.put(`/api-services/${serviceId}`, payload)
    return response.data
  },

  delete: async (serviceId: string): Promise<{ message: string }> => {
    const response = await api.delete(`/api-services/${serviceId}`)
    return response.data
  },

  getEndpoints: async (serviceId: string): Promise<Endpoint[]> => {
    const response = await api.get(`/api-services/${serviceId}/endpoints`)
    return response.data
  },

  createEndpoint: async (
    serviceId: string,
    payload: CreateEndpointPayload
  ): Promise<Endpoint> => {
    const response = await api.post(`/api-services/${serviceId}/endpoints`, {
      path: payload.path,
      method: payload.method,
      is_active: payload.is_active ?? true,
    })
    return response.data
  },

  discoverEndpoints: async (serviceId: string): Promise<EndpointDiscoveryResult> => {
    const response = await api.post(`/api-services/${serviceId}/discover-endpoints`)
    return response.data
  },

  testEndpoint: async (
    serviceId: string,
    endpointId: string,
    payload?: EndpointTestPayload
  ): Promise<EndpointTestResult> => {
    const response = await api.post(
      `/api-services/${serviceId}/endpoints/${endpointId}/test`,
      payload ?? {}
    )
    return response.data
  },


  loginToMonitoredApi: async (
  serviceId: string,
  payload: {
    username: string
    password: string
    login_path?: string
  }
): Promise<MonitoredApiLoginResponse> => {
  const response = await api.post(`/api-services/${serviceId}/auth/login`, payload)
  return response.data
},
}