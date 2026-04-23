/**
 * PrivateRoute.tsx — Protection des routes
 * Si l'utilisateur n'est pas connecté → redirect vers /login grâce au composant Navigate de React Router.

 */
import React from 'react'
import { Navigate } from 'react-router-dom'
import { authService } from '../../services/auth.service'

interface PrivateRouteProps {
  children: React.ReactNode
}

export const PrivateRoute: React.FC<PrivateRouteProps> = ({ children }) => {
  // Vérifie si le token JWT existe dans localStorage
  if (!authService.isAuthenticated()) {
    return <Navigate to="/login" replace />
  }
  return <>{children}</>
}