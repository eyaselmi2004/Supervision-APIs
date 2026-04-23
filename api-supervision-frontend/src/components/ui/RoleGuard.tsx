/**
 * RoleGuard.tsx — Composant de protection par rôle
 *
 * Usage :
 *  <RoleGuard roles={['ADMIN']}>
 *    <button>Supprimer utilisateur</button>
 *  </RoleGuard>
 *
 * Si le rôle ne correspond pas → n'affiche rien (ou fallback)
 */

import React from 'react'
import { useAuth } from '../../hooks/useAuth'

interface RoleGuardProps {
  roles:     ('ADMIN' | 'DEVOPS')[]  // rôles autorisés
  children:  React.ReactNode          // contenu à afficher si autorisé
  fallback?: React.ReactNode          // contenu alternatif si non autorisé
}

export const RoleGuard: React.FC<RoleGuardProps> = ({
  roles,
  children,
  fallback = null,
  // fallback = null par défaut → n'affiche rien si non autorisé
}) => {
  const { user } = useAuth()

  // Vérifie si le rôle de l'utilisateur est dans la liste des rôles autorisés
  if (!user || !roles.includes(user.role)) {
    // Utilisateur non connecté ou rôle non autorisé
    return <>{fallback}</>
  }

  // Rôle autorisé → affiche le contenu
  return <>{children}</>
}