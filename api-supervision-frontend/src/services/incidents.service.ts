import api from './api'

export const incidentsService = {
  async getAll() {
    const res = await api.get('/incidents')
    return res.data
  },

  async create(data: {
    title: string
    api_service_id: string
  }) {
    const res = await api.post('/incidents', data)
    return res.data
  },

  async resolve(id: string, resolution: string) {
    const res = await api.post(`/incidents/${id}/resolve`, {
      resolution,
    })

    return res.data
  },

  async getByApiService(apiServiceId: string) {
    const res = await api.get(`/incidents/by-service/${apiServiceId}`)
    return res.data
  },
}

export const slaService = {
  async getByEndpoint(endpointId: string) {
    const res = await api.get(`/sla/endpoint/${endpointId}`)
    return res.data
  },

  async compute(data: {
    endpoint_id: string
    period_start: string
    period_end: string
  }) {
    const res = await api.post('/sla/compute', {
      endpoint_id: data.endpoint_id,
      period_start: data.period_start,
      period_end: data.period_end,
    })

    return res.data
  },
}

export const notificationsService = {
  async getAll() {
    const res = await api.get('/notification-channels')
    return res.data
  },

  async create(data: {
    name: string
    type: 'EMAIL' | 'WEBHOOK'
    target: string
    is_enabled: boolean
  }) {
    const res = await api.post('/notification-channels', data)
    return res.data
  },

  async update(id: string, data: { is_enabled: boolean }) {
    const res = await api.put(`/notification-channels/${id}`, data)
    return res.data
  },

  async delete(id: string) {
    const res = await api.delete(`/notification-channels/${id}`)
    return res.data
  },
}