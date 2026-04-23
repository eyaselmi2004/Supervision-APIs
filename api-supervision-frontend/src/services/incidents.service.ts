import api from './api'

// ── Service Incidents ─────────────────────────────────────
export const incidentsService = {

  /**
   * getAll()
   * Récupère tous les incidents triés par date décroissante
   * Endpoint : GET /incidents
   */
  async getAll() {
    const res = await api.get('/incidents')
    return res.data
  },

  /**
   * create()
   * Crée un nouvel incident manuellement
   * Endpoint : POST /incidents
   * Corps : { title, api_service_id }
   */
  async create(data: {
    title: string
    api_service_id: string
  }) {
    const res = await api.post('/incidents', data)
    return res.data
  },

  /**
   * resolve()
   * Résout un incident — OPEN → RESOLVED
   * Endpoint : POST /incidents/{id}/resolve
   * Corps : { resolution } ← nom exact attendu par le backend
   */
  async resolve(id: string, resolution: string) {
    const res = await api.post(`/incidents/${id}/resolve`, {
      resolution,
      // "resolution" = nom du champ dans le schéma Pydantic
      // IncidentResolveRequest : resolution: str
    })
    return res.data
  },

  /**
   * getByApiService()
   * Récupère les incidents d'une API spécifique
   * Endpoint : GET /incidents/by-service/{api_service_id}
   */
  async getByApiService(apiServiceId: string) {
    const res = await api.get(`/incidents/by-service/${apiServiceId}`)
    return res.data
  },
}

// ── Service SLA ───────────────────────────────────────────
export const slaService = {

  /**
   * getByEndpoint()
   * Récupère tous les rapports SLA d'un endpoint
   * Endpoint : GET /sla/endpoint/{endpoint_id}
   */
  async getByEndpoint(endpointId: string) {
    const res = await api.get(`/sla/endpoint/${endpointId}`)
    return res.data
  },

  /**
   * compute()
   * Génère et sauvegarde un nouveau rapport SLA
   * Endpoint : POST /sla/compute
   * Corps : { endpoint_id, period_start, period_end }
   */
  async compute(data: {
    endpoint_id:  string
    period_start: string
    period_end:   string
  }) {
    const res = await api.post('/sla/compute', {
      endpoint_id:  data.endpoint_id,
      // Supprime les millisecondes pour le parsing Pydantic
      period_start: data.period_start,
      period_end:   data.period_end,
    })
    return res.data
  },
}

// ── Service Notifications ─────────────────────────────────
export const notificationsService = {

  /**
   * getAll()
   * Récupère tous les canaux de notification
   * Endpoint : GET /notification-channels
   */
  async getAll() {
    const res = await api.get('/notification-channels')
    return res.data
  },

  /**
   * create()
   * Crée un nouveau canal de notification
   * Endpoint : POST /notification-channels
   * Corps : { name, type, target, is_enabled }
   */
  async create(data: {
    name:       string
    type:       'EMAIL' | 'WEBHOOK'
    target:     string
    is_enabled: boolean
  }) {
    const res = await api.post('/notification-channels', data)
    return res.data
  },

  /**
   * update()
   * Met à jour un canal (activer/désactiver)
   * Endpoint : PUT /notification-channels/{id}
   */
  async update(id: string, data: { is_enabled: boolean }) {
    const res = await api.put(`/notification-channels/${id}`, data)
    return res.data
  },

  /**
   * delete()
   * Supprime définitivement un canal
   * Endpoint : DELETE /notification-channels/{id}
   */
  async delete(id: string) {
    const res = await api.delete(`/notification-channels/${id}`)
    return res.data
  },
}