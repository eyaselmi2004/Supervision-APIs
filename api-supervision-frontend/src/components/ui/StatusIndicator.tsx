/**
 * StatusIndicator.tsx — Indicateurs de statut visuels avec icônes
 * Affiche un statut avec icône, couleur, et animation optionnelle
 */
import React from 'react'
import { AlertCircle, CheckCircle2, Clock, Zap, AlertTriangle } from 'lucide-react'

type StatusType = 'open' | 'in-progress' | 'resolved' | 'critical' | 'warning' | 'success' | 'pending'

interface StatusIndicatorProps {
  status: StatusType
  animated?: boolean
  size?: 'sm' | 'md' | 'lg'
  label?: string
}

const STATUS_CONFIG: Record<StatusType, {
  color: string
  icon: React.ReactNode
  label: string
  bgColor: string
}> = {
  open: {
    color: '#ef4444',
    icon: <AlertCircle size={16} />,
    label: 'Ouvert',
    bgColor: 'rgba(239,68,68,0.1)',
  },
  'in-progress': {
    color: '#f59e0b',
    icon: <Clock size={16} />,
    label: 'En cours',
    bgColor: 'rgba(245,158,11,0.1)',
  },
  resolved: {
    color: '#10b981',
    icon: <CheckCircle2 size={16} />,
    label: 'Résolu',
    bgColor: 'rgba(16,185,129,0.1)',
  },
  critical: {
    color: '#f87171',
    icon: <AlertCircle size={16} />,
    label: 'Critique',
    bgColor: 'rgba(239,68,68,0.15)',
  },
  warning: {
    color: '#fbbf24',
    icon: <AlertTriangle size={16} />,
    label: 'Attention',
    bgColor: 'rgba(245,158,11,0.15)',
  },
  success: {
    color: '#34d399',
    icon: <CheckCircle2 size={16} />,
    label: 'Succès',
    bgColor: 'rgba(16,185,129,0.12)',
  },
  pending: {
    color: '#e879f9',
    icon: <Zap size={16} />,
    label: 'En attente',
    bgColor: 'rgba(217,70,239,0.14)',
  },
}

export const StatusIndicator: React.FC<StatusIndicatorProps> = ({
  status,
  animated = false,
  size = 'md',
  label,
}) => {
  const config = STATUS_CONFIG[status]
  const sizeMap = { sm: 14, md: 16, lg: 18 }
  const sizeClass = sizeMap[size]

  // Ajouter animation pulse si nécessaire
  const styles: React.CSSProperties = animated ? {
    animation: `pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite`,
  } : {}

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '4px 10px',
        borderRadius: '6px',
        background: config.bgColor,
        color: config.color,
        fontSize: size === 'sm' ? '11px' : '12px',
        fontWeight: 500,
        ...styles,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', height: sizeClass }}>
        {React.cloneElement(config.icon as React.ReactElement, {
          size: sizeClass,
          style: { color: config.color },
        })}
      </div>
      {label || config.label}
    </div>
  )
}

/**
 * MiniProgressDot — Petit indicateur animé (pour listes)
 */
export const MiniStatusDot: React.FC<{ status: StatusType; animated?: boolean }> = ({
  status,
  animated = false,
}) => {
  const config = STATUS_CONFIG[status]

  return (
    <div
      style={{
        width: '8px',
        height: '8px',
        borderRadius: '50%',
        background: config.color,
        boxShadow: `0 0 0 2px ${config.bgColor}`,
        animation: animated ? `pulse 2s ease-in-out infinite` : 'none',
      }}
    />
  )
}

/**
 * StatusBadgeWithDot — Badge avec point animé
 */
export const StatusBadgeWithDot: React.FC<{ status: StatusType; animated?: boolean }> = ({
  status,
  animated = false,
}) => {
  const config = STATUS_CONFIG[status]

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '4px 12px',
        borderRadius: '20px',
        background: config.bgColor,
        border: `1px solid ${config.color}`,
        fontSize: '11px',
        fontWeight: 600,
        color: config.color,
      }}
    >
      <div
        style={{
          width: '6px',
          height: '6px',
          borderRadius: '50%',
          background: config.color,
          animation: animated ? `pulse 2s ease-in-out infinite` : 'none',
        }}
      />
      {config.label}
    </div>
  )
}

/**
 * Compact status line — pour tableaux
 */
export const CompactStatus: React.FC<{ status: StatusType }> = ({ status }) => {
  const config = STATUS_CONFIG[status]

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        fontSize: '12px',
        color: config.color,
      }}
    >
      <MiniStatusDot status={status} />
      {config.label}
    </div>
  )
}