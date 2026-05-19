import React, { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { AlertCircle, ArrowLeft, CheckCircle2, Lock, Mail, ShieldCheck, User } from 'lucide-react'
import api from '../services/api'
import { authService } from '../services/auth.service'

export const RegisterPage: React.FC = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const redirect = searchParams.get('redirect')

  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      await api.post('/auth/register', {
        name: form.name,
        email: form.email,
        password: form.password,
      })

      navigate(redirect ? `/login?redirect=${encodeURIComponent(redirect)}` : '/login')
    } catch (err: any) {
      setError(err.response?.data?.detail ?? 'Erreur lors de la création du compte')
    } finally {
      setLoading(false)
    }
  }

  const goToLogin = () => {
    navigate(redirect ? `/login?redirect=${encodeURIComponent(redirect)}` : '/login')
  }

  return (
    <div className="auth-page">
      <style>{authStyles}</style>

      <header className="auth-topbar">
        <button onClick={() => navigate('/')} className="auth-back-btn">
          <ArrowLeft size={14} /> Back to home
        </button>

        <button className="auth-brand" onClick={() => navigate('/')}>
          <span className="auth-logo">⌁</span>
          <span>
            <strong>traceon</strong>
            <small>API Supervision</small>
          </span>
        </button>
      </header>

      <main className="auth-shell">
        <section className="auth-info-panel">
          <div className="auth-eyebrow">Start supervision</div>
          <h1>Create a workspace for reliable API operations.</h1>
          <p>
            Set up your account, create projects and start tracking API health, metrics and incidents with a clean workflow.
          </p>

          <div className="auth-benefits">
            <div><CheckCircle2 size={16} /><span>Register monitored APIs quickly</span></div>
            <div><ShieldCheck size={16} /><span>Organize work by projects and teams</span></div>
            <div><Lock size={16} /><span>Secure access for technical users</span></div>
          </div>
        </section>

        <section className="auth-card" aria-label="Register form">
          <div className="auth-card-heading">
            <h2>Create account</h2>
            <p>
              {redirect
                ? 'Créez votre compte avec le même email que celui de l’invitation.'
                : 'Start monitoring your APIs with Traceon.'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="auth-form">
            <label>
              <span>Name</span>
              <div className="auth-input-wrap">
                <User size={16} />
                <input
                  value={form.name}
                  onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="Your name"
                  required
                />
              </div>
            </label>

            <label>
              <span>Email</span>
              <div className="auth-input-wrap">
                <Mail size={16} />
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                  placeholder="you@company.com"
                  required
                />
              </div>
            </label>

            <label>
              <span>Password</span>
              <div className="auth-input-wrap">
                <Lock size={16} />
                <input
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
                  placeholder="Minimum 6 characters"
                  required
                  minLength={6}
                />
              </div>
            </label>

            <div className="auth-separator">
              <span />
              <small>ou continuer avec</small>
              <span />
            </div>

            <div className="oauth-actions">
              <button type="button" className="oauth-btn" onClick={() => authService.loginWithGoogle()}>
                Continuer avec Google
              </button>

              <button type="button" className="oauth-btn" onClick={() => authService.loginWithGithub()}>
                Continuer avec GitHub
              </button>
            </div>

            {error && (
              <div className="auth-error">
                <AlertCircle size={16} />
                {error}
              </div>
            )}

            <button type="submit" className="auth-primary" disabled={loading}>
              {loading ? 'Creating account...' : 'Create account'}
            </button>
          </form>

          <div className="auth-switch">
            Already have an account? <button onClick={goToLogin}>Sign in</button>
          </div>
        </section>
      </main>
    </div>
  )
}

const authStyles = `
.auth-page {
  min-height: 100vh;
  background: var(--bg-main);
  color: var(--text-primary);
  font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}

.auth-topbar {
  height: 72px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 32px;
  border-bottom: 1px solid var(--border);
  background: var(--bg-main);
}

.auth-back-btn,
.auth-brand {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  border: 1px solid var(--border);
  background: var(--background-card);
  color: var(--text-muted);
  border-radius: 10px;
  height: 40px;
  padding: 0 14px;
  cursor: pointer;
  font-family: inherit;
  font-weight: 700;
}

.auth-brand {
  border: 0;
  background: transparent;
  color: var(--text-primary);
  padding: 0;
}

.auth-logo {
  width: 32px;
  height: 32px;
  border-radius: 9px;
  background: var(--pink-mid);
  color: white;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  font-weight: 900;
}

.auth-brand strong {
  display: block;
  line-height: 1;
  font-size: 15px;
}

.auth-brand small {
  display: block;
  margin-top: 4px;
  color: var(--text-subtle);
  font-size: 9px;
  text-transform: uppercase;
  letter-spacing: .15em;
}

.auth-shell {
  width: min(1060px, calc(100% - 48px));
  margin: 0 auto;
  min-height: calc(100vh - 72px);
  display: grid;
  grid-template-columns: 1fr 430px;
  gap: 56px;
  align-items: center;
  padding: 48px 0;
}

.auth-info-panel {
  max-width: 560px;
}

.auth-eyebrow {
  width: fit-content;
  border: 1px solid var(--border);
  background: var(--background-card);
  border-radius: 999px;
  padding: 5px 12px;
  color: var(--pink);
  text-transform: uppercase;
  letter-spacing: .12em;
  font-size: 11px;
  font-weight: 900;
}

.auth-info-panel h1 {
  margin: 18px 0 0;
  color: var(--text-primary);
  font-size: clamp(34px, 4vw, 54px);
  line-height: 1.05;
  letter-spacing: -0.04em;
  font-weight: 900;
}

.auth-info-panel p {
  margin: 20px 0 0;
  color: var(--text-muted);
  font-size: 16px;
  line-height: 1.75;
}

.auth-benefits {
  display: grid;
  gap: 12px;
  margin-top: 32px;
}

.auth-benefits div {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  background: var(--background-card);
  border: 1px solid var(--border);
  border-radius: 13px;
  color: var(--text-muted);
  font-weight: 700;
}

.auth-benefits svg {
  color: var(--pink);
}

.auth-card {
  background: var(--background-card);
  border: 1px solid var(--border);
  border-radius: 20px;
  padding: 34px;
  box-shadow: 0 24px 54px rgba(0,0,0,.20);
}

.auth-card-heading h2 {
  margin: 0;
  font-size: 28px;
  color: var(--text-primary);
  letter-spacing: -0.03em;
}

.auth-card-heading p {
  margin: 8px 0 0;
  color: var(--text-muted);
  line-height: 1.6;
}

.auth-form {
  display: grid;
  gap: 18px;
  margin-top: 26px;
}

.auth-form label > span {
  display: block;
  margin-bottom: 8px;
  color: var(--text-primary);
  font-size: 13px;
  font-weight: 800;
}

.auth-input-wrap {
  height: 46px;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 14px;
  border: 1px solid var(--border);
  background: var(--bg-secondary);
  border-radius: 11px;
  color: var(--text-subtle);
}

.auth-input-wrap:focus-within {
  border-color: var(--pink-mid);
  box-shadow: 0 0 0 3px var(--pink-bg);
}

.auth-input-wrap input {
  flex: 1;
  border: 0;
  outline: 0;
  background: transparent;
  color: var(--text-primary);
  font-family: inherit;
  font-size: 14px;
}

.auth-separator {
  display: flex;
  align-items: center;
  gap: 10px;
  color: var(--text-subtle);
}

.auth-separator span {
  flex: 1;
  height: 1px;
  background: var(--border);
}

.auth-separator small {
  font-size: 11px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: .08em;
}

.oauth-actions {
  display: grid;
  grid-template-columns: 1fr;
  gap: 10px;
}

.oauth-btn {
  height: 44px;
  border-radius: 11px;
  border: 1px solid var(--border);
  background: var(--bg-secondary);
  color: var(--text-primary);
  font-family: inherit;
  font-weight: 800;
  cursor: pointer;
}

.oauth-btn:hover {
  border-color: var(--pink-mid);
}

.auth-error {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--danger);
  background: var(--danger-bg);
  border: 1px solid rgba(248,113,113,.24);
  border-radius: 11px;
  padding: 11px 12px;
  font-size: 13px;
  font-weight: 700;
}

.auth-primary {
  height: 46px;
  border-radius: 11px;
  border: 1px solid var(--pink-mid);
  background: var(--pink-mid);
  color: white;
  font-family: inherit;
  font-weight: 900;
  cursor: pointer;
}

.auth-primary:disabled {
  opacity: .65;
  cursor: not-allowed;
}

.auth-switch {
  margin-top: 22px;
  text-align: center;
  color: var(--text-muted);
  font-size: 13px;
}

.auth-switch button {
  border: 0;
  background: transparent;
  color: var(--pink);
  font-weight: 900;
  cursor: pointer;
  font-family: inherit;
}

@media (max-width: 880px) {
  .auth-shell {
    grid-template-columns: 1fr;
    gap: 28px;
  }

  .auth-info-panel {
    display: none;
  }
}

@media (max-width: 520px) {
  .auth-topbar {
    padding: 0 16px;
  }

  .auth-shell {
    width: min(100% - 28px, 1060px);
  }

  .auth-card {
    padding: 24px;
  }

  .auth-brand small {
    display: none;
  }
}
`