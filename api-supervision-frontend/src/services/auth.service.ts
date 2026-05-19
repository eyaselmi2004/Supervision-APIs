/**
 * auth.service.ts — Appels API authentification
 * Gère login, register, logout et OAuth
 */
import api from './api'
import type { LoginRequest, RegisterRequest, TokenResponse, UserResponse } from '../types'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1'

export const authService = {
  async login(data: LoginRequest): Promise<TokenResponse> {
    const res = await api.post<TokenResponse>('/auth/login', data)
    localStorage.setItem('access_token', res.data.access_token)
    localStorage.setItem('refresh_token', res.data.refresh_token)
    return res.data
  },

  async register(data: RegisterRequest): Promise<UserResponse> {
    const res = await api.post<UserResponse>('/auth/register', data)
    return res.data
  },

  loginWithGoogle(): void {
    window.location.href = `${API_BASE_URL}/oauth/google/login`
  },

  loginWithGithub(): void {
    window.location.href = `${API_BASE_URL}/oauth/github/login`
  },

  saveOAuthTokens(accessToken: string, refreshToken: string): void {
    localStorage.setItem('access_token', accessToken)
    localStorage.setItem('refresh_token', refreshToken)
  },

  logout(): void {
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
  },

  isAuthenticated(): boolean {
    return !!localStorage.getItem('access_token')
  },
}