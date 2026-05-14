import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Bell,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Database,
  Gauge,
  Globe2,
  Lock,
  Menu,
  Moon,
  ShieldCheck,
  Sun,
  X,
} from 'lucide-react'

const TraceonLogo: React.FC<{ size?: number }> = ({ size = 34 }) => (
  <div className="lp-logo-mark" style={{ width: size, height: size }}>
    <Activity size={size * 0.52} />
  </div>
)

const LandingPage: React.FC = () => {
  const navigate = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [isLight, setIsLight] = useState(() => document.documentElement.getAttribute('data-theme') === 'light')

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const toggleTheme = () => {
    const nextTheme = isLight ? 'dark' : 'light'
    document.documentElement.setAttribute('data-theme', nextTheme)
    localStorage.setItem('traceon-theme', nextTheme)
    setIsLight(!isLight)
  }

  const modules = [
    {
      icon: Globe2,
      title: 'API services',
      text: 'Register services, discover endpoints and keep ownership clear by project.',
    },
    {
      icon: Gauge,
      title: 'Metrics overview',
      text: 'Follow latency, requests and error rate with focused operational views.',
    },
    {
      icon: AlertTriangle,
      title: 'Alerts & incidents',
      text: 'Detect failures quickly and keep the response workflow visible.',
    },
    {
      icon: ShieldCheck,
      title: 'SLA reliability',
      text: 'Measure availability and convert technical signals into clear reports.',
    },
  ]

  const workflow = [
    { icon: Database, title: 'Connect services', text: 'Add a project, register an API and discover its endpoints.' },
    { icon: BarChart3, title: 'Observe performance', text: 'Collect metrics continuously and identify abnormal behavior.' },
    { icon: Bell, title: 'Act on incidents', text: 'Open alerts, assign incidents and protect SLA commitments.' },
  ]

  return (
    <div className="lp-page">
      <style>{landingStyles}</style>

      <header className={`lp-navbar ${scrolled ? 'lp-navbar-scrolled' : ''}`}>
        <div className="lp-container lp-nav-inner">
          <button className="lp-brand" onClick={() => navigate('/')} aria-label="Traceon home">
            <TraceonLogo size={32} />
            <span>
              <strong>traceon</strong>
              <small>API Supervision</small>
            </span>
          </button>

          <nav className="lp-nav-links">
            <a href="#platform">Platform</a>
            <a href="#workflow">Workflow</a>
            <a href="#modules">Modules</a>
            <a href="#security">Security</a>
          </nav>

          <div className="lp-nav-actions">
            <button className="lp-icon-btn" onClick={toggleTheme} aria-label="Toggle theme">
              {isLight ? <Moon size={16} /> : <Sun size={16} />}
            </button>
            <button className="lp-link-btn" onClick={() => navigate('/login')}>Sign in</button>
            <button className="lp-secondary-btn" onClick={() => navigate('/register')}>Register</button>
            <button className="lp-primary-btn" onClick={() => navigate('/register')}>
              Get started <ArrowRight size={15} />
            </button>
          </div>

          <button className="lp-menu-btn" onClick={() => setMobileOpen((value) => !value)} aria-label="Open menu">
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        {mobileOpen && (
          <div className="lp-mobile-panel">
            <a href="#platform" onClick={() => setMobileOpen(false)}>Platform</a>
            <a href="#workflow" onClick={() => setMobileOpen(false)}>Workflow</a>
            <a href="#modules" onClick={() => setMobileOpen(false)}>Modules</a>
            <a href="#security" onClick={() => setMobileOpen(false)}>Security</a>
            <div className="lp-mobile-actions">
              <button className="lp-secondary-btn" onClick={() => navigate('/login')}>Sign in</button>
              <button className="lp-primary-btn" onClick={() => navigate('/register')}>Get started</button>
            </div>
          </div>
        )}
      </header>

      <main>
        <section className="lp-hero" id="platform">
          <div className="lp-container lp-hero-grid">
            <div className="lp-hero-copy">
              <div className="lp-eyebrow">Enterprise API supervision</div>
              <h1>Monitor your APIs with clarity, control and confidence.</h1>
              <p>
                Traceon helps technical teams centralize API health, performance metrics,
                alerts and incidents in one reliable operations workspace.
              </p>

              <div className="lp-hero-actions">
                <button className="lp-primary-btn lp-large-btn" onClick={() => navigate('/register')}>
                  Start monitoring <ArrowRight size={16} />
                </button>
                <button className="lp-secondary-btn lp-large-btn" onClick={() => navigate('/login')}>
                  Access platform
                </button>
              </div>

              <div className="lp-metrics-row">
                <div><strong>27</strong><span>APIs monitored</span></div>
                <div><strong>146</strong><span>Active checks</span></div>
                <div><strong>99.95%</strong><span>SLA target</span></div>
              </div>
            </div>

            <aside className="lp-cockpit-card" aria-label="Operations cockpit preview">
              <div className="lp-card-header">
                <div>
                  <strong>Operations cockpit</strong>
                  <span>Live service supervision</span>
                </div>
                <span className="lp-status-pill lp-green">Stable</span>
              </div>

              <div className="lp-main-signal">
                <div>
                  <span>Global API health</span>
                  <strong>98.7%</strong>
                </div>
                <ShieldCheck size={34} />
              </div>

              <div className="lp-signal-grid">
                <div>
                  <span>P95 latency</span>
                  <strong>92ms</strong>
                </div>
                <div>
                  <span>Error rate</span>
                  <strong>0.16%</strong>
                </div>
              </div>

              <div className="lp-table-card">
                {[
                  ['GET', '/api/v1/items', 'Healthy'],
                  ['POST', '/api/v1/login', 'Watch'],
                  ['GET', '/api/v1/users/me', 'Healthy'],
                ].map(([method, path, status]) => (
                  <div className="lp-endpoint-row" key={path}>
                    <span className="lp-method">{method}</span>
                    <span>{path}</span>
                    <strong className={status === 'Healthy' ? 'lp-text-success' : 'lp-text-warning'}>{status}</strong>
                  </div>
                ))}
              </div>

              <div className="lp-activity-list">
                <div><CheckCircle2 size={14} /><span>Auth service recovered</span><small>2m ago</small></div>
                <div><AlertTriangle size={14} /><span>Latency threshold reached</span><small>8m ago</small></div>
              </div>
            </aside>
          </div>
        </section>

        <section className="lp-strip">
          <div className="lp-container lp-strip-grid">
            <span>Built for supervision workflows</span>
            <span>Projects</span>
            <span>Metrics</span>
            <span>Alerts</span>
            <span>Incidents</span>
            <span>SLA</span>
          </div>
        </section>

        <section className="lp-section" id="workflow">
          <div className="lp-container">
            <div className="lp-section-heading">
              <div className="lp-eyebrow">How it works</div>
              <h2>A simple workflow from monitoring to response.</h2>
              <p>Traceon keeps the operational path readable: connect, observe, then act.</p>
            </div>

            <div className="lp-workflow-grid">
              {workflow.map((item, index) => (
                <div className="lp-workflow-card" key={item.title}>
                  <div className="lp-step-number">0{index + 1}</div>
                  <item.icon size={22} />
                  <h3>{item.title}</h3>
                  <p>{item.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="lp-section lp-section-muted" id="modules">
          <div className="lp-container">
            <div className="lp-section-heading lp-left-heading">
              <div className="lp-eyebrow">Product modules</div>
              <h2>Everything needed for API reliability in one interface.</h2>
              <p>Each page has a precise purpose, so users understand where to go and what to do.</p>
            </div>

            <div className="lp-module-grid">
              {modules.map((module) => (
                <article className="lp-module-card" key={module.title}>
                  <div className="lp-module-icon"><module.icon size={20} /></div>
                  <h3>{module.title}</h3>
                  <p>{module.text}</p>
                  <button onClick={() => navigate('/register')}>Explore <ChevronRight size={14} /></button>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="lp-section" id="security">
          <div className="lp-container lp-security-card">
            <div>
              <div className="lp-eyebrow">Secure by design</div>
              <h2>Designed for teams that need control and accountability.</h2>
              <p>
                Role-based access, project separation and clear incident ownership help teams
                operate with confidence without overloading the interface.
              </p>
            </div>

            <div className="lp-security-list">
              <div><Lock size={17} /><span>JWT authentication</span></div>
              <div><ShieldCheck size={17} /><span>Role-based access control</span></div>
              <div><Clock3 size={17} /><span>Operational history and timelines</span></div>
            </div>
          </div>
        </section>

        <section className="lp-cta-section">
          <div className="lp-container lp-cta-card">
            <div>
              <div className="lp-eyebrow">Ready to launch</div>
              <h2>Bring production-grade supervision to your API stack.</h2>
              <p>Start with one API service, then extend monitoring across your projects.</p>
            </div>
            <div className="lp-cta-actions">
              <button className="lp-primary-btn lp-large-btn" onClick={() => navigate('/register')}>Create account</button>
              <button className="lp-secondary-btn lp-large-btn" onClick={() => navigate('/login')}>Sign in</button>
            </div>
          </div>
        </section>
      </main>

      <footer className="lp-footer">
        <div className="lp-container lp-footer-grid">
          <div>
            <div className="lp-brand lp-footer-brand">
              <TraceonLogo size={28} />
              <span><strong>traceon</strong><small>API Supervision</small></span>
            </div>
            <p>Enterprise API monitoring platform for modern technical teams.</p>
          </div>
          <div>
            <strong>Platform</strong>
            <a href="#modules">API Services</a>
            <a href="#modules">Metrics</a>
            <a href="#modules">Alerts</a>
          </div>
          <div>
            <strong>Company</strong>
            <a href="#platform">About</a>
            <a href="#workflow">Docs</a>
            <a href="#security">Security</a>
          </div>
          <div>
            <strong>Access</strong>
            <button onClick={() => navigate('/login')}>Sign in</button>
            <button onClick={() => navigate('/register')}>Register</button>
          </div>
        </div>
        <div className="lp-container lp-footer-bottom">© 2026 Traceon. All rights reserved.</div>
      </footer>
    </div>
  )
}

const landingStyles = `
.lp-page {
  min-height: 100vh;
  background: var(--bg-main);
  color: var(--text-primary);
  font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}
.lp-container {
  width: min(1120px, calc(100% - 48px));
  margin: 0 auto;
}
.lp-navbar {
  position: sticky;
  top: 0;
  z-index: 40;
  background: var(--bg-main);
  border-bottom: 1px solid transparent;
}
.lp-navbar-scrolled {
  border-bottom-color: var(--border);
  background: color-mix(in srgb, var(--bg-main) 94%, transparent);
  backdrop-filter: blur(12px);
}
.lp-nav-inner {
  height: 72px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
}
.lp-brand {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  border: 0;
  background: transparent;
  padding: 0;
  cursor: pointer;
  color: var(--text-primary);
  text-decoration: none;
}
.lp-brand strong {
  display: block;
  font-size: 15px;
  line-height: 1;
  letter-spacing: -0.02em;
}
.lp-brand small {
  display: block;
  margin-top: 4px;
  font-size: 9px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.16em;
  color: var(--text-subtle);
}
.lp-logo-mark {
  border-radius: 9px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: var(--pink-mid);
  color: white;
  box-shadow: 0 8px 18px rgba(0,0,0,0.14);
}
.lp-nav-links {
  display: flex;
  align-items: center;
  gap: 28px;
}
.lp-nav-links a,
.lp-footer a,
.lp-footer button {
  color: var(--text-muted);
  text-decoration: none;
  font-size: 13px;
  font-weight: 600;
}
.lp-nav-links a:hover,
.lp-footer a:hover,
.lp-footer button:hover {
  color: var(--text-primary);
}
.lp-nav-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}
.lp-icon-btn,
.lp-menu-btn {
  width: 38px;
  height: 38px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  border: 1px solid var(--border);
  background: var(--background-card);
  color: var(--text-muted);
  cursor: pointer;
}
.lp-menu-btn { display: none; }
.lp-link-btn {
  border: 0;
  background: transparent;
  color: var(--text-muted);
  font-weight: 700;
  cursor: pointer;
  padding: 10px 12px;
}
.lp-primary-btn,
.lp-secondary-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border-radius: 10px;
  font-size: 13px;
  font-weight: 800;
  font-family: inherit;
  cursor: pointer;
  min-height: 40px;
  padding: 0 18px;
  transition: transform .15s ease, border-color .2s ease, background-color .2s ease;
}
.lp-primary-btn {
  border: 1px solid var(--pink-mid);
  background: var(--pink-mid);
  color: white;
}
.lp-secondary-btn {
  border: 1px solid var(--border);
  background: var(--background-card);
  color: var(--text-primary);
}
.lp-primary-btn:hover,
.lp-secondary-btn:hover,
.lp-icon-btn:hover {
  transform: translateY(-1px);
  border-color: var(--pink-mid);
}
.lp-large-btn {
  min-height: 46px;
  padding: 0 22px;
}
.lp-mobile-panel {
  display: none;
}
.lp-hero {
  padding: 88px 0 74px;
  border-bottom: 1px solid var(--border);
}
.lp-hero-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 480px;
  gap: 72px;
  align-items: center;
}
.lp-eyebrow {
  display: inline-flex;
  align-items: center;
  width: fit-content;
  padding: 5px 12px;
  border-radius: 999px;
  border: 1px solid var(--border);
  background: var(--background-card);
  color: var(--pink);
  font-size: 11px;
  font-weight: 900;
  text-transform: uppercase;
  letter-spacing: .12em;
}
.lp-hero h1,
.lp-section h2,
.lp-cta-card h2 {
  margin: 18px 0 0;
  color: var(--text-primary);
  font-weight: 900;
  letter-spacing: -0.04em;
  line-height: 1.05;
}
.lp-hero h1 { font-size: clamp(42px, 5vw, 68px); max-width: 680px; }
.lp-section h2,
.lp-cta-card h2 { font-size: clamp(30px, 3vw, 42px); max-width: 720px; }
.lp-hero p,
.lp-section-heading p,
.lp-security-card p,
.lp-cta-card p {
  margin: 20px 0 0;
  color: var(--text-muted);
  font-size: 16px;
  line-height: 1.75;
  max-width: 560px;
}
.lp-hero-actions {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  margin-top: 32px;
}
.lp-metrics-row {
  margin-top: 40px;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}
.lp-metrics-row div,
.lp-cockpit-card,
.lp-workflow-card,
.lp-module-card,
.lp-security-card,
.lp-cta-card {
  background: var(--background-card);
  border: 1px solid var(--border);
  border-radius: 18px;
}
.lp-metrics-row div {
  padding: 18px;
}
.lp-metrics-row strong {
  display: block;
  font-size: 25px;
  color: var(--text-primary);
}
.lp-metrics-row span {
  display: block;
  margin-top: 4px;
  color: var(--text-subtle);
  font-size: 12px;
  font-weight: 700;
}
.lp-cockpit-card {
  padding: 24px;
  box-shadow: 0 24px 54px rgba(0,0,0,.22);
}
.lp-card-header,
.lp-main-signal,
.lp-endpoint-row,
.lp-activity-list div,
.lp-footer-bottom {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.lp-card-header strong { display: block; font-size: 15px; }
.lp-card-header span:not(.lp-status-pill) { display: block; margin-top: 3px; font-size: 12px; color: var(--text-subtle); }
.lp-status-pill {
  border-radius: 999px;
  padding: 4px 10px;
  font-size: 11px;
  font-weight: 900;
}
.lp-green { background: var(--success-bg); color: var(--success); }
.lp-main-signal {
  margin-top: 20px;
  padding: 22px;
  border: 1px solid var(--border);
  border-radius: 14px;
  background: var(--bg-secondary);
}
.lp-main-signal span,
.lp-signal-grid span,
.lp-endpoint-row span,
.lp-activity-list small {
  color: var(--text-subtle);
  font-size: 12px;
  font-weight: 700;
}
.lp-main-signal strong {
  display: block;
  margin-top: 5px;
  font-size: 36px;
  letter-spacing: -0.04em;
}
.lp-signal-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  margin-top: 12px;
}
.lp-signal-grid div,
.lp-table-card,
.lp-activity-list {
  border: 1px solid var(--border);
  background: var(--bg-secondary);
  border-radius: 14px;
}
.lp-signal-grid div {
  padding: 17px;
}
.lp-signal-grid strong {
  display: block;
  margin-top: 5px;
  font-size: 22px;
}
.lp-table-card {
  margin-top: 12px;
  overflow: hidden;
}
.lp-endpoint-row {
  padding: 12px 14px;
  border-bottom: 1px solid var(--border);
  gap: 12px;
}
.lp-endpoint-row:last-child { border-bottom: 0; }
.lp-endpoint-row span:nth-child(2) {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  color: var(--text-muted);
  font-size: 13px;
}
.lp-method {
  color: var(--pink) !important;
  background: var(--pink-bg);
  border-radius: 999px;
  padding: 3px 8px;
  font-size: 10px !important;
}
.lp-text-success { color: var(--success); font-size: 12px; }
.lp-text-warning { color: var(--warning); font-size: 12px; }
.lp-activity-list {
  margin-top: 12px;
  padding: 12px 14px;
}
.lp-activity-list div {
  justify-content: flex-start;
  gap: 9px;
  margin-bottom: 8px;
}
.lp-activity-list div:last-child { margin-bottom: 0; }
.lp-activity-list span { flex: 1; font-size: 13px; color: var(--text-muted); }
.lp-strip {
  padding: 18px 0;
  border-bottom: 1px solid var(--border);
  background: var(--background-card);
}
.lp-strip-grid {
  display: grid;
  grid-template-columns: 2fr repeat(5, 1fr);
  gap: 16px;
  align-items: center;
  color: var(--text-subtle);
  font-size: 12px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: .08em;
}
.lp-strip-grid span:first-child { color: var(--text-primary); }
.lp-section {
  padding: 86px 0;
  border-bottom: 1px solid var(--border);
}
.lp-section-muted {
  background: var(--bg-secondary);
}
.lp-section-heading {
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 40px;
}
.lp-left-heading {
  text-align: left;
  align-items: flex-start;
}
.lp-workflow-grid,
.lp-module-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 18px;
}
.lp-module-grid {
  grid-template-columns: repeat(4, minmax(0, 1fr));
}
.lp-workflow-card,
.lp-module-card {
  padding: 24px;
  min-height: 210px;
}
.lp-workflow-card:hover,
.lp-module-card:hover,
.lp-cockpit-card:hover,
.lp-security-card:hover,
.lp-cta-card:hover {
  border-color: var(--border-hover);
}
.lp-step-number {
  color: var(--pink);
  font-size: 12px;
  font-weight: 900;
  letter-spacing: .1em;
  margin-bottom: 22px;
}
.lp-workflow-card svg,
.lp-module-icon {
  color: var(--lavender);
}
.lp-workflow-card h3,
.lp-module-card h3 {
  margin: 18px 0 8px;
  font-size: 17px;
  color: var(--text-primary);
}
.lp-workflow-card p,
.lp-module-card p {
  margin: 0;
  color: var(--text-muted);
  font-size: 13px;
  line-height: 1.65;
}
.lp-module-icon {
  width: 42px;
  height: 42px;
  border-radius: 12px;
  border: 1px solid var(--border);
  background: var(--bg-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
}
.lp-module-card button {
  margin-top: 20px;
  border: 0;
  background: transparent;
  color: var(--pink);
  font-weight: 900;
  display: inline-flex;
  align-items: center;
  gap: 3px;
  cursor: pointer;
  padding: 0;
}
.lp-security-card,
.lp-cta-card {
  padding: 42px;
  display: grid;
  grid-template-columns: 1fr 360px;
  gap: 40px;
  align-items: center;
}
.lp-security-list {
  display: grid;
  gap: 12px;
}
.lp-security-list div {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 15px;
  border: 1px solid var(--border);
  border-radius: 13px;
  background: var(--bg-secondary);
  color: var(--text-muted);
  font-weight: 700;
}
.lp-security-list svg { color: var(--pink); }
.lp-cta-section {
  padding: 86px 0;
}
.lp-cta-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  flex-wrap: wrap;
}
.lp-footer {
  padding: 54px 0 24px;
  background: var(--bg-secondary);
  border-top: 1px solid var(--border);
}
.lp-footer-grid {
  display: grid;
  grid-template-columns: 1.5fr repeat(3, 1fr);
  gap: 40px;
  padding-bottom: 34px;
}
.lp-footer p {
  color: var(--text-subtle);
  max-width: 260px;
  line-height: 1.7;
  font-size: 13px;
}
.lp-footer strong {
  display: block;
  margin-bottom: 14px;
  font-size: 12px;
  color: var(--text-primary);
  text-transform: uppercase;
  letter-spacing: .1em;
}
.lp-footer a,
.lp-footer button {
  display: block;
  margin-bottom: 10px;
  background: transparent;
  border: 0;
  padding: 0;
  cursor: pointer;
  font-family: inherit;
}
.lp-footer-bottom {
  border-top: 1px solid var(--border);
  padding-top: 22px;
  color: var(--text-subtle);
  font-size: 12px;
}
@media (max-width: 980px) {
  .lp-nav-links,
  .lp-nav-actions { display: none; }
  .lp-menu-btn { display: inline-flex; }
  .lp-mobile-panel {
    display: block;
    padding: 16px 24px 24px;
    border-top: 1px solid var(--border);
    background: var(--bg-main);
  }
  .lp-mobile-panel a {
    display: block;
    padding: 13px 0;
    border-bottom: 1px solid var(--border);
    color: var(--text-muted);
    text-decoration: none;
    font-weight: 700;
  }
  .lp-mobile-actions { display: flex; gap: 10px; margin-top: 16px; }
  .lp-hero-grid,
  .lp-security-card,
  .lp-cta-card { grid-template-columns: 1fr; }
  .lp-module-grid { grid-template-columns: repeat(2, 1fr); }
  .lp-strip-grid { grid-template-columns: repeat(3, 1fr); }
}
@media (max-width: 640px) {
  .lp-container { width: min(100% - 28px, 1120px); }
  .lp-hero { padding-top: 58px; }
  .lp-metrics-row,
  .lp-workflow-grid,
  .lp-module-grid,
  .lp-footer-grid { grid-template-columns: 1fr; }
  .lp-cockpit-card,
  .lp-security-card,
  .lp-cta-card { padding: 22px; }
  .lp-strip-grid { grid-template-columns: 1fr 1fr; }
}
`

export default LandingPage
