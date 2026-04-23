/**
 * StatCard.tsx — Dashboard stat card component
 * Displays a key value with icon and trend
 */
import React from 'react'
import type { LucideIcon } from 'lucide-react'

interface StatCardProps {
  title: string
  value: string | number
  unit?: string
  icon: LucideIcon
  color?: 'blue' | 'green' | 'red' | 'yellow'
  loading?: boolean
}

const COLOR_CLASSES = {
  blue: { icon: 'text-primary-400', bg: 'bg-primary-500/10' },
  green: { icon: 'text-success-500', bg: 'bg-success-500/10' },
  red: { icon: 'text-danger-500', bg: 'bg-danger-500/10' },
  yellow: { icon: 'text-warning-500', bg: 'bg-warning-500/10' },
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  unit,
  icon: Icon,
  color = 'blue',
  loading = false,
}) => {
  const c = COLOR_CLASSES[color]

  if (loading) {
    return (
      <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-5">
        <div className="skeleton h-3.5 w-20 mb-3" />
        <div className="skeleton h-7 w-30" />
      </div>
    )
  }

  return (
    <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-5 transition-all duration-200 cursor-default">
      {/* Header — title + icon */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs font-medium text-[var(--color-text-secondary)]">{title}</span>
        <div className={`p-2 rounded-lg ${c.bg}`}>
          <Icon size={16} className={c.icon} />
        </div>
      </div>

      {/* Value */}
      <div className="flex items-baseline gap-1.5">
        <span className="text-2xl font-bold text-[var(--color-text-primary)] font-mono">
          {typeof value === 'number' ? value.toLocaleString() : value}
        </span>
        {unit && <span className="text-sm text-[var(--color-text-secondary)]">{unit}</span>}
      </div>
    </div>
  )
}