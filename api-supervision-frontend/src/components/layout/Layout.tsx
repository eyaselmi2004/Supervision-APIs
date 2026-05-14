import React from 'react'
import { Sidebar } from './Sidebar'

interface LayoutProps {
  children: React.ReactNode
}

export const Layout: React.FC<LayoutProps> = ({ children }) => (
  <div className="app-shell">
    <Sidebar />
    <main className="app-main">
      {children}
    </main>
  </div>
)
