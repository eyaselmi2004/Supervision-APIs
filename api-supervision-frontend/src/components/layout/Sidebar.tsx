import React from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Globe, Activity,
  AlertTriangle, Shield, Radio, Bell,
  LogOut, Users, User, Package,
  Sun, Moon,
} from 'lucide-react'
import { authService } from '../../services/auth.service'
import { useAuth } from '../../hooks/useAuth'
import { useThemeContext } from '../../contexts/ThemeContext'

const TraceonLogo: React.FC<{ size?: number }> = ({ size = 30 }) => (
  <svg width={size} height={size} viewBox="0 0 34 34" fill="none">
    <rect width="34" height="34" rx="9" fill="var(--pink-mid)" />
    <path
      d="M7 20 L11 14 L16 18 L21 10 L27 16"
      stroke="#fff"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
    <circle cx="27" cy="16" r="2.5" fill="var(--lavender)" />
  </svg>
)

const NAV_ITEMS_ALL = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/projects', icon: Package, label: 'Projects' },
  { to: '/teams', icon: Users, label: 'Teams' },
  { to: '/metrics', icon: Activity, label: 'Metrics' },
  { to: '/alerts', icon: AlertTriangle, label: 'Alerts' },
  { to: '/incidents', icon: Shield, label: 'Incidents' },
  { to: '/sla', icon: Radio, label: 'SLA' },
]

const NAV_ITEMS_ADMIN = [
  { to: '/api-services', icon: Globe, label: 'APIs' },
  { to: '/notifications', icon: Bell, label: 'Notifications' },
  { to: '/users', icon: Users, label: 'Users' },
]

export const Sidebar: React.FC = () => {
  const navigate = useNavigate()
  const { user, isAdmin } = useAuth()
  const { isLight, toggleTheme, isDark } = useThemeContext()

  const handleLogout = () => {
    authService.logout()
    navigate('/')
  }

  const navItemStyle = (isActive: boolean): React.CSSProperties => ({
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    minHeight: 40,
    padding: '9px 12px',
    borderRadius: 10,
    fontSize: 13,
    fontWeight: 700,
    color: isActive ? 'var(--pink)' : 'var(--text-muted)',
    background: isActive ? 'var(--pink-bg)' : 'transparent',
    border: `1px solid ${isActive ? 'rgba(217,109,148,0.28)' : 'transparent'}`,
    textDecoration: 'none',
    transition: 'background-color 0.18s ease, border-color 0.18s ease, color 0.18s ease',
    marginBottom: 4,
    cursor: 'pointer',
  })

  const sectionTitle = (label: string) => (
    <p
      style={{
        padding: '0 12px',
        margin: '18px 0 8px',
        fontSize: 11,
        fontWeight: 800,
        color: 'var(--text-subtle)',
        textTransform: 'uppercase',
        letterSpacing: '0.12em',
      }}
    >
      {label}
    </p>
  )

  return (
    <aside
      style={{
        position: 'fixed',
        left: 0,
        top: 0,
        height: '100vh',
        width: 248,
        background: 'var(--background-card)',
        borderRight: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 40,
      }}
    >
      <button
        onClick={() => navigate('/dashboard')}
        style={{
          padding: '20px 18px',
          border: 0,
          borderBottom: '1px solid var(--border)',
          background: 'transparent',
          display: 'flex',
          alignItems: 'center',
          gap: 11,
          cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        <TraceonLogo size={31} />
        <div>
          <div style={{ fontSize: 15, fontWeight: 850, color: 'var(--text-primary)', letterSpacing: '-0.02em', lineHeight: 1.1 }}>
            traceon
          </div>
          <div style={{ fontSize: 9, fontWeight: 800, color: 'var(--text-subtle)', letterSpacing: '0.18em', textTransform: 'uppercase' }}>
            API Supervision
          </div>
        </div>
      </button>

      <nav style={{ flex: 1, padding: '10px 12px', overflowY: 'auto' }}>
        {sectionTitle('Navigation')}

        {NAV_ITEMS_ALL.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/dashboard'}
            style={({ isActive }) => navItemStyle(isActive)}
            onMouseEnter={(e) => {
              const el = e.currentTarget as HTMLElement
              if (!el.getAttribute('aria-current')) {
                el.style.background = 'var(--bg-hover)'
                el.style.color = 'var(--text-primary)'
              }
            }}
            onMouseLeave={(e) => {
              const el = e.currentTarget as HTMLElement
              if (!el.getAttribute('aria-current')) {
                el.style.background = 'transparent'
                el.style.color = 'var(--text-muted)'
              }
            }}
          >
            {({ isActive }) => (
              <>
                <Icon size={16} style={{ color: isActive ? 'var(--pink-mid)' : 'var(--text-subtle)', flexShrink: 0 }} />
                {label}
              </>
            )}
          </NavLink>
        ))}

        {isAdmin && (
          <>
            {sectionTitle('Administration')}
            {NAV_ITEMS_ADMIN.map(({ to, icon: Icon, label }) => (
              <NavLink
                key={to}
                to={to}
                style={({ isActive }) => navItemStyle(isActive)}
                onMouseEnter={(e) => {
                  const el = e.currentTarget as HTMLElement
                  if (!el.getAttribute('aria-current')) {
                    el.style.background = 'var(--bg-hover)'
                    el.style.color = 'var(--text-primary)'
                  }
                }}
                onMouseLeave={(e) => {
                  const el = e.currentTarget as HTMLElement
                  if (!el.getAttribute('aria-current')) {
                    el.style.background = 'transparent'
                    el.style.color = 'var(--text-muted)'
                  }
                }}
              >
                {({ isActive }) => (
                  <>
                    <Icon size={16} style={{ color: isActive ? 'var(--pink-mid)' : 'var(--text-subtle)', flexShrink: 0 }} />
                    {label}
                  </>
                )}
              </NavLink>
            ))}
          </>
        )}
      </nav>

      <div style={{ padding: 12, borderTop: '1px solid var(--border)' }}>
        <div
          style={{
            padding: 10,
            borderRadius: 14,
            border: '1px solid var(--border)',
            background: 'var(--background-card-soft)',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            marginBottom: 10,
          }}
        >
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 11,
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: isAdmin ? 'var(--pink-bg)' : 'var(--lav-bg)',
              border: `1px solid ${isAdmin ? 'rgba(217,109,148,0.26)' : 'rgba(155,140,255,0.26)'}`,
            }}
          >
            <User size={16} style={{ color: isAdmin ? 'var(--pink)' : 'var(--lavender)' }} />
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user?.name || user?.email || 'User'}
            </div>
            <div style={{ fontSize: 11, fontWeight: 800, color: isAdmin ? 'var(--pink)' : 'var(--lavender)', letterSpacing: '0.06em' }}>
              {user?.role || 'DEVOPS'}
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 40px', gap: 8, marginBottom: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', padding: '0 4px', fontSize: 12, color: 'var(--text-muted)', fontWeight: 700 }}>
            {isLight ? 'Light mode' : 'Dark mode'}
          </div>
          <button
            onClick={toggleTheme}
            title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            style={{
              width: 38,
              height: 38,
              borderRadius: 11,
              cursor: 'pointer',
              border: '1px solid var(--border)',
              background: 'var(--bg-secondary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {isDark ? <Sun size={16} style={{ color: 'var(--pink)' }} /> : <Moon size={16} style={{ color: 'var(--pink)' }} />}
          </button>
        </div>

        <button
          onClick={handleLogout}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '10px 12px',
            borderRadius: 11,
            background: 'transparent',
            border: '1px solid transparent',
            color: 'var(--text-muted)',
            fontSize: 13,
            fontWeight: 750,
            cursor: 'pointer',
            textAlign: 'left',
          }}
          onMouseEnter={(e) => {
            ;(e.currentTarget as HTMLElement).style.color = 'var(--danger)'
            ;(e.currentTarget as HTMLElement).style.background = 'var(--danger-bg)'
            ;(e.currentTarget as HTMLElement).style.borderColor = 'rgba(239,107,107,0.18)'
          }}
          onMouseLeave={(e) => {
            ;(e.currentTarget as HTMLElement).style.color = 'var(--text-muted)'
            ;(e.currentTarget as HTMLElement).style.background = 'transparent'
            ;(e.currentTarget as HTMLElement).style.borderColor = 'transparent'
          }}
        >
          <LogOut size={16} />
          Sign out
        </button>
      </div>
    </aside>
  )
}
