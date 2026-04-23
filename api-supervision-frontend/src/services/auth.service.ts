/**
 * auth.service.ts — Appels API authentification
 * Gère login, register et logout
 */
import api from './api'
import type { LoginRequest, RegisterRequest, TokenResponse, UserResponse } from '../types'

export const authService = {

  // Connexion — stocke les tokens dans localStorage
  async login(data: LoginRequest): Promise<TokenResponse> {
    const res = await api.post<TokenResponse>('/auth/login', data)
    localStorage.setItem('access_token',  res.data.access_token)
    localStorage.setItem('refresh_token', res.data.refresh_token)
    return res.data
  },

  // Inscription — crée un nouveau compte
  async register(data: RegisterRequest): Promise<UserResponse> {
    const res = await api.post<UserResponse>('/auth/register', data)
    return res.data
  },

  // Déconnexion — vide le localStorage
  logout(): void {
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
  },

  // Vérifie si l'utilisateur est connecté
  isAuthenticated(): boolean {
    return !!localStorage.getItem('access_token')
  },
}