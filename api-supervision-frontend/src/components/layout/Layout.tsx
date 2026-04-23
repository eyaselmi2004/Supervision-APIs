import React from 'react'
import { Sidebar } from './Sidebar'

interface LayoutProps {
  children: React.ReactNode
}

export const Layout: React.FC<LayoutProps> = ({ children }) => (
  <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-main)' }}>
    <Sidebar />
    <main style={{
      flex: 1,
      marginLeft: 240,
      overflowY: 'auto',
      background: 'var(--bg-main)',
      minHeight: '100vh',
      transition: 'background 0.25s ease',
    }}>
      {children}
    </main>
  </div>
)