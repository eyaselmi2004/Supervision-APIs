import React, { createContext, useContext } from 'react'
import { useTheme } from '../hooks/useTheme'

interface ThemeContextType {
  theme:       'dark' | 'light'
  toggleTheme: () => void
  isDark:      boolean
  isLight:     boolean
}

const ThemeContext = createContext<ThemeContextType | null>(null)

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const themeValue = useTheme()
  return (
    <ThemeContext.Provider value={themeValue}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useThemeContext = (): ThemeContextType => {
  const ctx = useContext(ThemeContext)
  if (!ctx) {
    return { theme: 'dark', toggleTheme: () => {}, isDark: true, isLight: false }
  }
  return ctx
}