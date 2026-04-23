import React from 'react'
import { Moon, Sun } from 'lucide-react'
import { useThemeContext } from '../../contexts/ThemeContext'

export const ThemeToggle: React.FC = () => {
  const { isDark, toggleTheme } = useThemeContext()

  return (
    <button
      onClick={toggleTheme}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      className="flex items-center justify-center w-9 h-9 rounded-lg border border-[var(--border)] bg-white/[0.03] text-[var(--text-subtle)] cursor-pointer transition-all duration-200 hover:border-primary-400/60 hover:text-primary-200 hover:bg-primary-500/12 flex-shrink-0"
    >
      {isDark ? <Sun size={16} /> : <Moon size={16} />}
    </button>
  )
}