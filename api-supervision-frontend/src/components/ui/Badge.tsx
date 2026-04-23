/**
 * Badge.tsx — Badges réutilisables avec variantes multiples
 * Utilisé pour : Sévérité, Statut, Type, Priorité, etc.
 */
import React from 'react'

type Variant = 'critical' | 'warning' | 'info' | 'success' | 'neutral' | 'primary' | 'secondary'

interface BadgeProps {
  children: React.ReactNode
  variant?: Variant
  dot?: boolean
  size?: 'sm' | 'md'
  onClick?: () => void
  style?: React.CSSProperties
}

// Couleurs cohérentes avec ton design
const BADGE_STYLES: Record<Variant, { bg: string; color: string; border: string; dotColor: string }> = {
  critical: {
    bg: 'rgba(239,68,68,0.15)',
    color: '#f87171',
    border: 'rgba(239,68,68,0.2)',
    dotColor: '#ef4444',
  },
  warning: {
    bg: 'rgba(245,158,11,0.15)',
    color: '#fbbf24',
    border: 'rgba(245,158,11,0.2)',
    dotColor: '#f59e0b',
  },
  info: {
    bg: 'rgba(217,165,239,0.15)',
    color: '#f0abfc',
    border: 'rgba(217,165,239,0.25)',
    dotColor: '#d946ef',
  },
  success: {
    bg: 'rgba(16,185,129,0.12)',
    color: '#6ee7b7',
    border: 'rgba(16,185,129,0.15)',
    dotColor: '#10b981',
  },
  neutral: {
    bg: 'rgba(100,116,139,0.1)',
    color: '#94a3b8',
    border: 'rgba(100,116,139,0.15)',
    dotColor: '#64748b',
  },
  primary: {
    bg: 'rgba(217,165,239,0.15)',
    color: '#f0abfc',
    border: 'rgba(217,165,239,0.25)',
    dotColor: '#d946ef',
  },
  secondary: {
    bg: 'rgba(236,72,153,0.12)',
    color: '#f472b6',
    border: 'rgba(236,72,153,0.2)',
    dotColor: '#ec4899',
  },
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'neutral',
  dot = false,
  size = 'md',
  onClick,
  style,
}) => {
  const badgeStyle = BADGE_STYLES[variant] || BADGE_STYLES['neutral']
  const sizeStyle = size === 'sm' 
    ? { padding: '2px 8px', fontSize: '10px', gap: '4px' } 
    : { padding: '4px 10px', fontSize: '11px', gap: '5px' }

  return (
    <span
      onClick={onClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        ...sizeStyle,
        borderRadius: '20px',
        fontWeight: 500,
        background: badgeStyle.bg,
        color: badgeStyle.color,
        border: `1px solid ${badgeStyle.border}`,
        cursor: onClick ? 'pointer' : 'default',
        transition: 'all 0.15s',
        whiteSpace: 'nowrap',
        ...style,
      }}
      onMouseEnter={(e) => {
        if (onClick) {
          e.currentTarget.style.background = badgeStyle.border
        }
      }}
      onMouseLeave={(e) => {
        if (onClick) {
          e.currentTarget.style.background = badgeStyle.bg
        }
      }}
    >
      {dot && (
        <span
          style={{
            width: '5px',
            height: '5px',
            borderRadius: '50%',
            background: badgeStyle.dotColor,
          }}
        />
      )}
      {children}
    </span>
  )
}

/**
 * Badges spécialisés — Prédéfinis pour cas courants
 */

export const AlertSeverityBadge: React.FC<{ severity: string }> = ({ severity }) => {
  const map: Record<string, { label: string; variant: Variant }> = {
    CRITICAL: { label: 'Critique', variant: 'critical' },
    WARNING: { label: 'Attention', variant: 'warning' },
    INFO: { label: 'Information', variant: 'info' },
  }
  const { label, variant } = map[severity] ?? { label: severity, variant: 'neutral' }
  return <Badge variant={variant}>{label}</Badge>
}

export const AlertStatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const map: Record<string, { label: string; variant: Variant }> = {
    OPEN: { label: 'Ouvert', variant: 'critical' },
    ACKNOWLEDGED: { label: 'Pris en charge', variant: 'warning' },
    RESOLVED: { label: 'Résolu', variant: 'success' },
  }
  const { label, variant } = map[status] ?? { label: status, variant: 'neutral' }
  return <Badge variant={variant} dot>{label}</Badge>
}

export const IncidentStatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const map: Record<string, { label: string; variant: Variant }> = {
    OPEN: { label: 'Actif', variant: 'critical' },
    IN_PROGRESS: { label: 'En cours', variant: 'warning' },
    RESOLVED: { label: 'Résolu', variant: 'success' },
    CLOSED: { label: 'Fermé', variant: 'neutral' },
  }
  const { label, variant } = map[status] ?? { label: status, variant: 'neutral' }
  return <Badge variant={variant} dot>{label}</Badge>
}

export const PriorityBadge: React.FC<{ priority: string }> = ({ priority }) => {
  const map: Record<string, { label: string; variant: Variant }> = {
    CRITICAL: { label: 'Critique', variant: 'critical' },
    HIGH: { label: 'Haute', variant: 'warning' },
    MEDIUM: { label: 'Moyenne', variant: 'info' },
    LOW: { label: 'Basse', variant: 'success' },
  }
  const { label, variant } = map[priority] ?? { label: priority, variant: 'neutral' }
  return <Badge variant={variant}>{label}</Badge>
}

export const MethodBadge: React.FC<{ method: string }> = ({ method }) => {
  const methodVariantMap: Record<string, Variant> = {
    GET: 'success',
    POST: 'primary',
    PUT: 'warning',
    DELETE: 'critical',
    PATCH: 'secondary',
  }
  return <Badge variant={methodVariantMap[method] ?? 'neutral'}>{method}</Badge>
}

export const StatusTypeBadge: React.FC<{ type: string }> = ({ type }) => {
  const map: Record<string, { label: string; variant: Variant }> = {
    LATENCY: { label: 'Latence', variant: 'warning' },
    ERROR_RATE: { label: "Taux d'erreur", variant: 'critical' },
    DOWNTIME: { label: 'Indisponibilité', variant: 'critical' },
    UPTIME: { label: 'Disponibilité', variant: 'success' },
  }
  const { label, variant } = map[type] ?? { label: type, variant: 'neutral' }
  return <Badge variant={variant}>{label}</Badge>
}