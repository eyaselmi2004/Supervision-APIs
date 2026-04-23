/**
 * Input.tsx — Reusable form input and select components
 */
import React from 'react'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
  options: { value: string; label: string }[]
}

export const Input: React.FC<InputProps> = ({ label, error, className = '', ...props }) => (
  <div className="flex flex-col gap-1.5">
    {label && <label className="text-xs font-medium text-[var(--color-text-secondary)]">{label}</label>}
    <input
      className={`w-full px-3 py-2 text-sm text-[var(--color-text-primary)] bg-[var(--color-surface)] border rounded-lg outline-none transition-all duration-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:bg-[var(--color-background)] ${error ? 'border-danger-500 focus:ring-danger-500/20' : 'border-[var(--color-border)]'} ${className}`}
      {...props}
    />
    {error && <span className="text-xs text-danger-500">{error}</span>}
  </div>
)

export const Select: React.FC<SelectProps> = ({ label, error, options, className = '', ...props }) => (
  <div className="flex flex-col gap-1.5">
    {label && <label className="text-xs font-medium text-[var(--color-text-secondary)]">{label}</label>}
    <select
      className={`w-full px-3 py-2 text-sm text-[var(--color-text-primary)] bg-[var(--color-surface)] border rounded-lg outline-none transition-all duration-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:bg-[var(--color-background)] ${error ? 'border-danger-500 focus:ring-danger-500/20' : 'border-[var(--color-border)]'} ${className}`}
      {...props}
    >
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
    {error && <span className="text-xs text-danger-500">{error}</span>}
  </div>
)