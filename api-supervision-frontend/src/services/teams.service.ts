import { api } from './api'

export interface Team {
  id: string
  name: string
  description?: string
  invite_code: string
  owner_id: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface TeamMember {
  user_id: string
  name: string
  email: string
  role: 'owner' | 'admin' | 'member'
  joined_at: string
}

export interface TeamCreate {
  name: string
  description?: string
}

export const teamsService = {
  // Récupérer tous les teams
  async getAll() {
    const response = await api.get<Team[]>('/teams/')
    return response.data
  },

  // Récupérer un team spécifique
  async getById(teamId: string) {
    const response = await api.get<Team>(`/teams/${teamId}`)
    return response.data
  },

  // Créer un team
  async create(data: TeamCreate) {
    const response = await api.post<Team>('/teams/', data)
    return response.data
  },

  // Modifier un team
  async update(teamId: string, data: TeamCreate) {
    const response = await api.put<Team>(`/teams/${teamId}`, data)
    return response.data
  },

  // Supprimer un team
  async delete(teamId: string) {
    const response = await api.delete(`/teams/${teamId}`)
    return response.data
  },

  // Récupérer les membres d'un team
  async getMembers(teamId: string) {
    const response = await api.get<TeamMember[]>(`/teams/${teamId}/members`)
    return response.data
  },

  // Inviter un utilisateur
  async inviteUser(teamId: string, email: string, role: 'admin' | 'member' = 'member') {
    const response = await api.post(`/teams/${teamId}/invite`, null, {
      params: { email, role },
    })
    return response.data
  },

  // Accepter une invitation
  async acceptInvitation(teamId: string) {
    const response = await api.post(`/teams/${teamId}/accept-invitation`)
    return response.data
  },

  // Rejeter une invitation
  async rejectInvitation(teamId: string) {
    const response = await api.post(`/teams/${teamId}/reject-invitation`)
    return response.data
  },

  // Supprimer un membre
  async removeMember(teamId: string, memberId: string) {
    const response = await api.delete(`/teams/${teamId}/members/${memberId}`)
    return response.data
  },

  // Récupérer les invitations pending
  async getPendingInvitations() {
    const response = await api.get('/teams/invitations/pending')
    return response.data
  },
}