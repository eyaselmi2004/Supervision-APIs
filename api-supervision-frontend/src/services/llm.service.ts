import api from './api'
import type { ExplainIssueRequest, ExplainIssueResponse } from '../types'

export const llmService = {
  explainIssue: async (payload: ExplainIssueRequest): Promise<ExplainIssueResponse> => {
    const response = await api.post('/llm/explain-issue', payload)
    return response.data
  },
}