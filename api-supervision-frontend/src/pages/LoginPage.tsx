import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Mail, Lock, AlertCircle, ArrowLeft } from 'lucide-react'
import { authService } from '../services/auth.service'

/* ── Traceon Logo ── */
const TraceonLogo: React.FC<{ size?: number }> = ({ size = 34 }) => (
  <svg width={size} height={size} viewBox="0 0 34 34" fill="none">
    <rect width="34" height="34" rx="8" fill="#E07FA0" />
    <path d="M7 20 L11 14 L16 18 L21 10 L27 16"
      stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    <circle cx="27" cy="16" r="2.5" fill="#C4B5FD" />
  </svg>
)

export const LoginPage: React.FC = () => {
  const navigate = useNavigate()
  const [form, setForm]       = useState({ email: '', password: '' })
  const [error, setError]     = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await authService.login(form)
      navigate('/dashboard')
    } catch (err: any) {
      setError(err.response?.data?.detail ?? 'Invalid email or password')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg-main)',
      display: 'flex',
      flexDirection: 'column',
      fontFamily: "'Inter', system-ui, sans-serif",
    }}>

      {/* ── Top bar: brand LEFT, back RIGHT ── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 32px', height: 64,
        borderBottom: '1px solid var(--border)',
        background: 'var(--bg-main)',
        flexShrink: 0,
      }}>
        {/* Back — LEFT */}
        <button
          onClick={() => navigate('/')}
          style={{
            display: 'flex', alignItems: 'center', gap: 7,
            background: 'none', border: '1px solid var(--border)',
            cursor: 'pointer', color: 'var(--text-muted)',
            fontSize: 13, fontWeight: 500, fontFamily: 'inherit',
            padding: '7px 14px', borderRadius: 8,
            transition: 'color 0.15s, background 0.15s, border-color 0.15s',
          }}
          onMouseEnter={e => {
            const el = e.currentTarget as HTMLElement
            el.style.color = 'var(--text-primary)'
            el.style.background = 'var(--background-card)'
            el.style.borderColor = 'var(--border-hover)'
          }}
          onMouseLeave={e => {
            const el = e.currentTarget as HTMLElement
            el.style.color = 'var(--text-muted)'
            el.style.background = 'none'
            el.style.borderColor = 'var(--border)'
          }}
        >
          <ArrowLeft size={14} /> Back to home
        </button>

        {/* Brand — RIGHT */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }} onClick={() => navigate('/')}>
          <TraceonLogo size={30} />
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em', lineHeight: 1.1 }}>traceon</div>
            <div style={{ fontSize: 9, fontWeight: 600, color: 'var(--text-subtle)', letterSpacing: '0.18em', textTransform: 'uppercase' }}>API Supervision</div>
          </div>
        </div>
      </div>

      {/* ── Page content ── */}
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 24px',
      }}>
        <div style={{ width: '100%', maxWidth: 420 }}>

          {/* Heading */}
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <h1 style={{ fontSize: 26, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.03em', margin: '0 0 8px' }}>
              Welcome back
            </h1>
            <p style={{ fontSize: 14, color: 'var(--text-muted)', margin: 0, lineHeight: 1.6 }}>
              Sign in to your Traceon account
            </p>
          </div>

          {/* Form card */}
          <div style={{
            background: 'var(--background-card)',
            border: '1px solid var(--border)',
            borderRadius: 18, padding: '32px',
          }}>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

              {/* Email */}
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>
                  Email
                </label>
                <div style={{ position: 'relative' }}>
                  <Mail size={15} style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-subtle)', pointerEvents: 'none' }} />
                  <input
                    type="email"
                    value={form.email}
                    onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                    placeholder="you@company.com"
                    required
                    style={{
                      width: '100%', paddingLeft: 40, paddingRight: 14,
                      paddingTop: 11, paddingBottom: 11,
                      borderRadius: 8, fontSize: 14, fontFamily: 'inherit',
                      background: 'var(--bg-secondary)',
                      border: '1px solid var(--border)',
                      color: 'var(--text-primary)', outline: 'none',
                      transition: 'border-color 0.18s, box-shadow 0.18s',
                    }}
                    onFocus={e => {
                      e.target.style.borderColor = 'var(--pink-mid)'
                      e.target.style.boxShadow = '0 0 0 3px var(--pink-bg)'
                    }}
                    onBlur={e => {
                      e.target.style.borderColor = 'var(--border)'
                      e.target.style.boxShadow = 'none'
                    }}
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                    Password
                  </label>
                  <span style={{ fontSize: 12, color: 'var(--lavender)', cursor: 'pointer', fontWeight: 500 }}>
                    Forgot password?
                  </span>
                </div>
                <div style={{ position: 'relative' }}>
                  <Lock size={15} style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-subtle)', pointerEvents: 'none' }} />
                  <input
                    type="password"
                    value={form.password}
                    onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                    placeholder="••••••••"
                    required
                    style={{
                      width: '100%', paddingLeft: 40, paddingRight: 14,
                      paddingTop: 11, paddingBottom: 11,
                      borderRadius: 8, fontSize: 14, fontFamily: 'inherit',
                      background: 'var(--bg-secondary)',
                      border: '1px solid var(--border)',
                      color: 'var(--text-primary)', outline: 'none',
                      transition: 'border-color 0.18s, box-shadow 0.18s',
                    }}
                    onFocus={e => {
                      e.target.style.borderColor = 'var(--pink-mid)'
                      e.target.style.boxShadow = '0 0 0 3px var(--pink-bg)'
                    }}
                    onBlur={e => {
                      e.target.style.borderColor = 'var(--border)'
                      e.target.style.boxShadow = 'none'
                    }}
                  />
                </div>
              </div>

              {/* Error */}
              {error && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '11px 14px', borderRadius: 9, background: 'var(--danger-bg)', border: '1px solid rgba(248,113,113,0.25)' }}>
                  <AlertCircle size={15} color="var(--danger)" style={{ flexShrink: 0 }} />
                  <span style={{ fontSize: 13, color: 'var(--danger)', lineHeight: 1.4 }}>{error}</span>
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                style={{
                  width: '100%', padding: '13px', borderRadius: 9,
                  fontSize: 15, fontWeight: 700, fontFamily: 'inherit',
                  background: 'var(--pink-mid)',
                  color: '#fff', border: 'none',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.7 : 1,
                  transition: 'filter 0.18s, transform 0.15s',
                  marginTop: 4,
                }}
                onMouseEnter={e => { if (!loading) { (e.currentTarget as HTMLElement).style.filter = 'brightness(1.12)'; (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)' } }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.filter = 'none'; (e.currentTarget as HTMLElement).style.transform = 'translateY(0)' }}
              >
                {loading ? 'Signing in…' : 'Sign in'}
              </button>
            </form>

            {/* Divider */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '24px 0' }}>
              <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
              <span style={{ fontSize: 12, color: 'var(--text-subtle)', fontWeight: 500 }}>or</span>
              <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
            </div>

            {/* Register note */}
            <p style={{ textAlign: 'center', fontSize: 14, color: 'var(--text-muted)', margin: 0 }}>
              Don't have an account?{' '}
              <span
                style={{ color: 'var(--pink)', fontWeight: 600, cursor: 'pointer' }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = 'var(--pink-deep)'}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = 'var(--pink)'}
              >
                Contact your admin
              </span>
            </p>
          </div>

          {/* Footer */}
          <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-subtle)', marginTop: 24, lineHeight: 1.6 }}>
            By signing in, you agree to our{' '}
            <span style={{ color: 'var(--lavender)', cursor: 'pointer' }}>Terms of Service</span>
            {' '}and{' '}
            <span style={{ color: 'var(--lavender)', cursor: 'pointer' }}>Privacy Policy</span>.
          </p>
        </div>
      </div>
    </div>
  )
}