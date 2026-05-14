import api from './api'

export interface ExplainIssuePayload {
  service_name: string
  method: string
  path: string
  avg_latency_ms: number
  p95_latency_ms: number
  error_rate_percent: number
  total_requests: number
  response_preview?: string
}

export interface ExplainIssueResponse {
  analysis: string
}

export interface ExplainEndpointIssueResponse {
  endpoint_id: string
  analysis: string
}

export interface ExplainIncidentResponse {
  incident_id: string
  analysis: string
}

export const llmService = {
  async explainIssue(payload: ExplainIssuePayload): Promise<ExplainIssueResponse> {
    const res = await api.post<ExplainIssueResponse>('/llm/explain-issue', payload)
    return res.data
  },

  async explainEndpointIssue(
    endpointId: string,
    periodHours = 24,
  ): Promise<ExplainEndpointIssueResponse> {
    const res = await api.post<ExplainEndpointIssueResponse>(
      `/llm/explain-endpoint/${endpointId}`,
      {
        period_hours: periodHours,
      },
    )

    return res.data
  },

  async explainIncident(incidentId: string): Promise<ExplainIncidentResponse> {
    const res = await api.post<ExplainIncidentResponse>(
      `/llm/explain-incident/${incidentId}`,
    )

    return res.data
  },
}