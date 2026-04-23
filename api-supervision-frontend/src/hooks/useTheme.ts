/**
 * useTheme.ts — Traceon theme hook
 * Persists to localStorage under 'traceon-theme'
 * Applies data-theme attribute on <html>
 */
import { useState, useEffect } from 'react'

type Theme = 'dark' | 'light'

export const useTheme = () => {
  const [theme, setTheme] = useState<Theme>(() => {
    try {
      return (localStorage.getItem('traceon-theme') as Theme) || 'dark'
    } catch {
      return 'dark'
    }
  })

  useEffect(() => {
    const root = document.documentElement
    if (theme === 'light') {
      root.setAttribute('data-theme', 'light')
    } else {
      root.removeAttribute('data-theme')
    }
    try {
      localStorage.setItem('traceon-theme', theme)
    } catch {}
  }, [theme])

  const toggleTheme = () => setTheme(prev => prev === 'dark' ? 'light' : 'dark')

  return {
    theme,
    toggleTheme,
    isDark:  theme === 'dark',
    isLight: theme === 'light',
  }
}