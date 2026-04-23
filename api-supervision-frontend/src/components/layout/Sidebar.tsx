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

/* ── Traceon Logo ── */
const TraceonLogo: React.FC<{ size?: number }> = ({ size = 28 }) => (
  <svg width={size} height={size} viewBox="0 0 34 34" fill="none">
    <rect width="34" height="34" rx="8" fill="#E07FA0" />
    <path d="M7 20 L11 14 L16 18 L21 10 L27 16"
      stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    <circle cx="27" cy="16" r="2.5" fill="#C4B5FD" />
  </svg>
)

const NAV_ITEMS_ALL = [
  { to: '/dashboard',  icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/projects',   icon: Package,         label: 'Projects' },
  { to: '/metrics',    icon: Activity,        label: 'Metrics' },
  { to: '/alerts',     icon: AlertTriangle,   label: 'Alerts' },
  { to: '/incidents',  icon: Shield,          label: 'Incidents' },
  { to: '/sla',        icon: Radio,           label: 'SLA' },
]

const NAV_ITEMS_ADMIN = [
  { to: '/teams',         icon: Users,  label: 'Teams' },
  { to: '/api-services',  icon: Globe,  label: 'APIs' },
  { to: '/notifications', icon: Bell,   label: 'Notifications' },
  { to: '/users',         icon: Users,  label: 'Users' },
]

export const Sidebar: React.FC = () => {
  const navigate = useNavigate()
  const { user, isAdmin }       = useAuth()
  const { isLight, toggleTheme, isDark } = useThemeContext()

  const handleLogout = () => {
    authService.logout()
    navigate('/')
  }

  const navItemStyle = (isActive: boolean): React.CSSProperties => ({
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '9px 12px', borderRadius: 8,
    fontSize: 14, fontWeight: 500,
    color: isActive ? 'var(--pink)' : 'var(--text-muted)',
    background: isActive ? 'var(--pink-bg)' : 'transparent',
    border: `1px solid ${isActive ? 'rgba(224,127,160,0.25)' : 'transparent'}`,
    textDecoration: 'none',
    transition: 'all 0.18s',
    marginBottom: 2,
    cursor: 'pointer',
  })

  return (
    <aside style={{
      position: 'fixed', left: 0, top: 0,
      height: '100vh', width: 240,
      background: 'var(--background-card)',
      borderRight: '1px solid var(--border)',
      display: 'flex', flexDirection: 'column',
      zIndex: 40, transition: 'background 0.25s, border-color 0.25s',
    }}>

      {/* ── Logo ── */}
      <div style={{ padding: '18px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10 }}>
        <TraceonLogo size={30} />
        <div>
          <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em', lineHeight: 1.1 }}>traceon</div>
          <div style={{ fontSize: 9, fontWeight: 600, color: 'var(--text-subtle)', letterSpacing: '0.18em', textTransform: 'uppercase' }}>API Supervision</div>
        </div>
      </div>

      {/* ── Navigation ── */}
      <nav style={{ flex: 1, padding: '12px 10px', overflowY: 'auto' }}>
        <p style={{ padding: '0 10px', marginBottom: 8, marginTop: 4, fontSize: 11, fontWeight: 700, color: 'var(--text-subtle)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
          Navigation
        </p>

        {NAV_ITEMS_ALL.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/dashboard'}
            style={({ isActive }) => navItemStyle(isActive)}
            onMouseEnter={e => {
              const el = e.currentTarget as HTMLElement
              if (!el.style.background.includes('pink')) {
                el.style.background = 'var(--bg-hover)'
                el.style.color = 'var(--text-primary)'
              }
            }}
            onMouseLeave={e => {
              const el = e.currentTarget as HTMLElement
              if (!el.classList.contains('active')) {
                el.style.background = 'transparent'
                el.style.color = 'var(--text-muted)'
              }
            }}
          >
            {({ isActive }) => (
              <>
                <Icon size={15} style={{ color: isActive ? 'var(--pink-mid)' : 'var(--text-subtle)', flexShrink: 0 }} />
                {label}
              </>
            )}
          </NavLink>
        ))}

        {isAdmin && (
          <>
            <p style={{ padding: '0 10px', marginBottom: 8, marginTop: 16, fontSize: 11, fontWeight: 700, color: 'var(--text-subtle)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              Administration
            </p>
            {NAV_ITEMS_ADMIN.map(({ to, icon: Icon, label }) => (
              <NavLink
                key={to}
                to={to}
                style={({ isActive }) => navItemStyle(isActive)}
                onMouseEnter={e => {
                  const el = e.currentTarget as HTMLElement
                  if (!el.style.background.includes('pink')) {
                    el.style.background = 'var(--bg-hover)'
                    el.style.color = 'var(--text-primary)'
                  }
                }}
                onMouseLeave={e => {
                  const el = e.currentTarget as HTMLElement
                  if (!el.classList.contains('active')) {
                    el.style.background = 'transparent'
                    el.style.color = 'var(--text-muted)'
                  }
                }}
              >
                {({ isActive }) => (
                  <>
                    <Icon size={15} style={{ color: isActive ? 'var(--pink-mid)' : 'var(--text-subtle)', flexShrink: 0 }} />
                    {label}
                  </>
                )}
              </NavLink>
            ))}
          </>
        )}
      </nav>

      {/* ── User info ── */}
      <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{
          width: 34, height: 34, borderRadius: 9, flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: isAdmin ? 'var(--pink-bg)' : 'var(--lav-bg)',
          border: `1px solid ${isAdmin ? 'rgba(224,127,160,0.3)' : 'rgba(196,181,253,0.3)'}`,
        }}>
          <User size={15} style={{ color: isAdmin ? 'var(--pink)' : 'var(--lavender)' }} />
        </div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {user?.name || user?.email || 'User'}
          </div>
          <div style={{ fontSize: 11, fontWeight: 700, color: isAdmin ? 'var(--pink)' : 'var(--lavender)', letterSpacing: '0.06em' }}>
            {user?.role || 'DEVOPS'}
          </div>
        </div>
      </div>

      {/* ── Theme toggle ── */}
      <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 500 }}>
          {isLight ? 'Light mode' : 'Dark mode'}
        </span>
        <button
          onClick={toggleTheme}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: 34, height: 34, borderRadius: 8, cursor: 'pointer',
            border: '1px solid var(--border)', background: 'var(--bg-secondary)',
            transition: 'border-color 0.2s, background 0.2s',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--pink-mid)'; (e.currentTarget as HTMLElement).style.background = 'var(--pink-bg)' }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'; (e.currentTarget as HTMLElement).style.background = 'var(--bg-secondary)' }}
          title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {isDark
            ? <Sun size={15} style={{ color: 'var(--pink)' }} />
            : <Moon size={15} style={{ color: 'var(--violet)' }} />}
        </button>
      </div>

      {/* ── Logout ── */}
      <div style={{ padding: '10px' }}>
        <button
          onClick={handleLogout}
          style={{
            display: 'flex', alignItems: 'center', gap: 10,
            width: '100%', padding: '9px 12px', borderRadius: 8,
            border: 'none', background: 'transparent', cursor: 'pointer',
            fontSize: 14, fontWeight: 500, color: 'var(--text-muted)',
            fontFamily: 'inherit', transition: 'color 0.15s, background 0.15s',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'var(--danger)'; (e.currentTarget as HTMLElement).style.background = 'var(--danger-bg)' }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)'; (e.currentTarget as HTMLElement).style.background = 'transparent' }}
        >
          <LogOut size={15} />
          Sign out
        </button>
      </div>
    </aside>
  )
}