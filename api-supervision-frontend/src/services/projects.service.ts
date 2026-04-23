import api from './api'
import type { Project, ProjectCreate, ProjectStats, MessageResponse } from '../types'

export const projectsService = {
  async getAll(): Promise<Project[]> {
    const res = await api.get<Project[]>('/projects')
    return res.data
  },

  async getById(id: string): Promise<Project> {
    const res = await api.get<Project>(`/projects/${id}`)
    return res.data
  },

  async create(data: ProjectCreate): Promise<Project> {
    const res = await api.post<Project>('/projects', data)
    return res.data
  },

  async update(id: string, data: ProjectCreate): Promise<Project> {
    const res = await api.put<Project>(`/projects/${id}`, data)
    return res.data
  },

  async delete(id: string): Promise<MessageResponse> {
    const res = await api.delete<MessageResponse>(`/projects/${id}`)
    return res.data
  },

  async getStats(id: string): Promise<ProjectStats> {
    const res = await api.get<ProjectStats>(`/projects/${id}/stats`)
    return res.data
  },

  // Récupérer mes projets (par équipe)
  async getMyProjects() {
  const response = await api.get<Project[]>('/projects/my-projects')
  return response.data

}}