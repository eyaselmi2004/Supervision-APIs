import { useMemo, useEffect, useState } from 'react'
import api from '../services/api'

interface User {
  id:    string
  name:  string
  email: string
  role:  'ADMIN' | 'DEVOPS'
}

export const useAuth = () => {
  const token = localStorage.getItem('access_token')
  const [userName, setUserName] = useState<string>('')

  // Décode le payload JWT
  const tokenData = useMemo(() => {
    if (!token) return null
    try {
      const decoded = JSON.parse(atob(token.split('.')[1]))
      return {
        id:   decoded.sub  || '',
        role: decoded.role || 'DEVOPS',
      }
    } catch {
      return null
    }
  }, [token])

  // Charge le nom depuis l'API /users/me
  useEffect(() => {
    if (!tokenData?.id) return
    api.get('/users/me')
      .then(res => setUserName(res.data.name || res.data.email || ''))
      .catch(() => setUserName(''))
  }, [tokenData?.id])

  const user: User | null = tokenData ? {
    id:    tokenData.id,
    name:  userName,
    email: '',
    role:  tokenData.role as 'ADMIN' | 'DEVOPS',
  } : null

  const isAdmin  = tokenData?.role === 'ADMIN'
  const isDevOps = tokenData?.role === 'DEVOPS'

  const logout = () => {
    localStorage.removeItem('access_token')
    window.location.href = '/login'
  }

  return { user, isAdmin, isDevOps, logout }
}