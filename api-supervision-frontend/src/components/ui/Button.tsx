/**
 * Button.tsx — Reusable button component
 * 4 variants: primary, secondary, danger, ghost
 * Supports Lucide icons and loading state
 */
import React from 'react'
import type { LucideIcon } from 'lucide-react'
import { Loader2 } from 'lucide-react'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'accent' | 'danger' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  icon?: LucideIcon
  loading?: boolean
}

const VARIANT_CLASSES = {
  primary: 'bg-primary-500 text-white border-transparent hover:bg-primary-600 hover:shadow-lg hover:shadow-primary-500/20 transition-all duration-200',
  secondary: 'bg-[var(--color-surface)] text-[var(--color-text-primary)] border-[var(--color-border)] hover:border-primary-500 hover:bg-[var(--color-surface-hover)] transition-all duration-200',
  accent: 'bg-accent-500 text-white border-transparent hover:bg-accent-600 hover:shadow-lg hover:shadow-accent-500/20 transition-all duration-200',
  danger: 'bg-danger-500/10 text-danger-500 border-danger-500/20 hover:bg-danger-500/15 transition-all duration-200',
  ghost: 'bg-transparent text-[var(--color-text-secondary)] border-transparent hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-hover)] transition-all duration-200',
}

const SIZE_CLASSES = {
  sm: 'px-3 py-1.5 text-xs gap-1',
  md: 'px-4 py-2 text-sm gap-1.5',
  lg: 'px-5 py-2.5 text-base gap-2',
}

const ICON_SIZES = {
  sm: 13,
  md: 15,
  lg: 16,
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  icon: Icon,
  loading = false,
  children,
  className = '',
  disabled,
  ...props
}) => {
  return (
    <button
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center font-medium rounded-md border transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed ${VARIANT_CLASSES[variant]} ${SIZE_CLASSES[size]} ${className}`}
      {...props}
    >
      {loading ? (
        <Loader2 size={ICON_SIZES[size]} className="animate-spin" />
      ) : Icon ? (
        <Icon size={ICON_SIZES[size]} />
      ) : null}
      {children}
    </button>
  )
}