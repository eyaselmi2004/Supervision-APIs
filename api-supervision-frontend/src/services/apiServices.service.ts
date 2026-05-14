import api from './api'

export const apiServicesService = {
  getAll: async (projectId?: string) => {
    const url = projectId
      ? `/api-services?project_id=${projectId}`
      : '/api-services'

    const response = await api.get(url)
    return response.data
  },

  getById: async (serviceId: string) => {
    const response = await api.get(`/api-services/${serviceId}`)
    return response.data
  },

  create: async (data: {
    name: string
    base_url: string
    is_active?: boolean
    project_id?: string | null
  }) => {
    const response = await api.post('/api-services', data)
    return response.data
  },

  update: async (
    serviceId: string,
    data: {
      name?: string
      base_url?: string
      is_active?: boolean
      project_id?: string | null
    }
  ) => {
    const response = await api.put(`/api-services/${serviceId}`, data)
    return response.data
  },

  delete: async (serviceId: string) => {
    const response = await api.delete(`/api-services/${serviceId}`)
    return response.data
  },

  getEndpoints: async (serviceId: string) => {
    const response = await api.get(`/api-services/${serviceId}/endpoints`)
    return response.data
  },

  createEndpoint: async (
    serviceId: string,
    data: {
      path: string
      method: string
      is_active?: boolean
    }
  ) => {
    const response = await api.post(`/api-services/${serviceId}/endpoints`, data)
    return response.data
  },

  discoverEndpoints: async (serviceId: string) => {
    const response = await api.post(`/api-services/${serviceId}/discover-endpoints`)
    return response.data
  },

  testEndpoint: async (
    serviceId: string,
    endpointId: string,
    payload?: {
      headers?: Record<string, string>
      query_params?: Record<string, string>
      json_body?: any
    }
  ) => {
    const response = await api.post(
      `/api-services/${serviceId}/endpoints/${endpointId}/test`,
      payload || {}
    )
    return response.data
  },

  loginToMonitoredApi: async (
    serviceId: string,
    data: {
      username: string
      password: string
      login_path?: string
    }
  ) => {
    const response = await api.post(`/api-services/${serviceId}/auth/login`, data)
    return response.data
  },
}