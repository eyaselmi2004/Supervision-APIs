import React, { useMemo, useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Activity, AlertTriangle, ArrowRight, Bell,
  ChartNoAxesCombined, CheckCircle2, Layers, Siren,
  ShieldCheck, Menu, X, Globe, Zap, Lock,
  ChevronRight, TrendingUp, TrendingDown, Sun, Moon,
} from 'lucide-react'

/* ── Traceon Logo ── */
const TraceonLogo: React.FC<{ size?: number }> = ({ size = 34 }) => (
  <svg width={size} height={size} viewBox="0 0 34 34" fill="none">
    <rect width="34" height="34" rx="8" fill="#E07FA0" />
    <path d="M7 20 L11 14 L16 18 L21 10 L27 16"
      stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    <circle cx="27" cy="16" r="2.5" fill="#C4B5FD" />
  </svg>
)

/* ── Spark bars ── */
const SparkBars: React.FC<{ color: string; values: number[] }> = ({ color, values }) => (
  <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 40 }}>
    {values.map((h, i) => (
      <div key={i} style={{ width: 13, height: `${h}%`, background: color, borderRadius: 3, transition: 'height 0.4s ease' }} />
    ))}
  </div>
)

/* ── Theme toggle button ── */
const ThemeToggle: React.FC<{ dark: boolean; onToggle: () => void }> = ({ dark, onToggle }) => (
  <button
    onClick={onToggle}
    style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      width: 38, height: 38, borderRadius: 8, cursor: 'pointer', border: 'none',
      background: dark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)',
      transition: 'background 0.2s, transform 0.15s',
    }}
    onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.1)')}
    onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
    title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
  >
    {dark
      ? <Sun size={17} color="#F4A7C0" />
      : <Moon size={17} color="#8B5CF6" />}
  </button>
)

const LandingPage: React.FC = () => {
  const navigate = useNavigate()

  /* ── theme: persist to localStorage ── */
  const [dark, setDark] = useState<boolean>(() => {
    try { return localStorage.getItem('traceon-theme') !== 'light' }
    catch { return true }
  })
  const toggleTheme = () => {
    setDark(d => {
      localStorage.setItem('traceon-theme', d ? 'light' : 'dark')
      return !d
    })
  }

  const [scrolled, setScrolled]         = useState(false)
  const [mobileOpen, setMobileOpen]     = useState(false)
  const [activeSignal, setActiveSignal] = useState(0)
  const [flowProgress, setFlowProgress] = useState(0)
  const [visibleCards, setVisibleCards] = useState<Set<number>>(new Set())
  const [activePillar, setActivePillar] = useState<number | null>(null)
  const [counter, setCounter]           = useState({ apis: 0, checks: 0, uptime: 0 })
  const workflowRef = useRef<HTMLElement | null>(null)
  const pillarsRef  = useRef<HTMLDivElement | null>(null)
  const heroRef     = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 60)
    window.addEventListener('scroll', fn)
    return () => window.removeEventListener('scroll', fn)
  }, [])

  useEffect(() => {
    const fn = () => {
      if (!workflowRef.current) return
      const rect = workflowRef.current.getBoundingClientRect()
      const p = (window.innerHeight * 0.8 - rect.top) / (window.innerHeight * 0.8 + rect.height * 0.25)
      setFlowProgress(Math.max(0, Math.min(1, p)))
    }
    fn()
    window.addEventListener('scroll', fn, { passive: true })
    return () => window.removeEventListener('scroll', fn)
  }, [])

  useEffect(() => {
    const obs = new IntersectionObserver(
      entries => entries.forEach(e => {
        if (e.isIntersecting)
          setVisibleCards(p => new Set([...p, Number((e.target as HTMLElement).dataset.idx)]))
      }),
      { threshold: 0.15 }
    )
    pillarsRef.current?.querySelectorAll('[data-idx]').forEach(c => obs.observe(c))
    return () => obs.disconnect()
  }, [])

  useEffect(() => {
    const obs = new IntersectionObserver(entries => {
      if (!entries[0].isIntersecting) return
      let f = 0
      const tick = () => {
        f++; const p = f / 60
        setCounter({ apis: Math.round(p * 27), checks: Math.round(p * 146), uptime: Math.round(p * 9999) / 100 })
        if (f < 60) requestAnimationFrame(tick)
      }
      requestAnimationFrame(tick)
      obs.disconnect()
    }, { threshold: 0.5 })
    if (heroRef.current) obs.observe(heroRef.current)
    return () => obs.disconnect()
  }, [])

  /* ── palette — switches on dark/light ── */
  const C = dark ? {
    base:       '#0C0E1A',
    surface:    '#13152A',
    card:       '#1D2040',
    border:     '#2A2D50',
    navBg:      'rgba(12,14,26,0.95)',
    pink:       '#F4A7C0',
    pinkMid:    '#E07FA0',
    pinkBg:     'rgba(244,167,192,0.10)',
    violet:     '#8B5CF6',
    lavender:   '#C4B5FD',
    lavBg:      'rgba(196,181,253,0.10)',
    white:      '#FFFFFF',
    text:       '#E8EAF6',
    textMuted:  '#8892C8',
    textSub:    '#565A8A',
    success:    '#34D399',
    successBg:  'rgba(52,211,153,0.12)',
    warn:       '#FBBF24',
    warnBg:     'rgba(251,191,36,0.12)',
    ctaBg:      '#1D2040',
    footerBg:   '#13152A',
  } : {
    base:       '#F8F6FF',
    surface:    '#FFFFFF',
    card:       '#FFFFFF',
    border:     '#E5E0F5',
    navBg:      'rgba(248,246,255,0.97)',
    pink:       '#C2547A',
    pinkMid:    '#C2547A',
    pinkBg:     'rgba(194,84,122,0.07)',
    violet:     '#7C3AED',
    lavender:   '#6D28D9',
    lavBg:      'rgba(124,58,237,0.07)',
    white:      '#1A1035',
    text:       '#1A1035',
    textMuted:  '#5B4F7A',
    textSub:    '#9E90C0',
    success:    '#059669',
    successBg:  'rgba(5,150,105,0.10)',
    warn:       '#D97706',
    warnBg:     'rgba(217,119,6,0.10)',
    ctaBg:      '#1D1040',
    footerBg:   '#F0EBF8',
  }

  const heroSignals = useMemo(() => [
    { label: 'Latency',   value: '92ms',   detail: 'P95 remains in target across all critical services.', trend: '+3%',  good: true,  bars: [32,48,38,60,52,70,65,80,72,88] },
    { label: 'Errors',    value: '0.16%',  detail: 'Error trend is contained and stable in the last hour.', trend: '−11%', good: true,  bars: [80,65,70,55,60,45,50,38,42,30] },
    { label: 'Incidents', value: '1 open', detail: 'One incident is active and currently being mitigated.', trend: '+1',   good: false, bars: [20,20,20,40,40,60,60,80,80,90] },
  ], [])

  const workflowSteps = useMemo(() => [
    { id:'01', title:'Observe API services',  desc:'Connect services and establish baseline health metrics.', icon:Layers,              right:false },
    { id:'02', title:'Track performance',     desc:'Follow latency and throughput behavior in live metrics.', icon:ChartNoAxesCombined, right:true  },
    { id:'03', title:'Detect anomalies',      desc:'Trigger alerts when availability or errors drift from targets.', icon:Siren,         right:false },
    { id:'04', title:'Coordinate incidents',  desc:'Escalate, assign and resolve incidents with full context.', icon:AlertTriangle,      right:true  },
    { id:'05', title:'Validate SLA outcomes', desc:'Review commitments and reliability reports by period.', icon:CheckCircle2,           right:false },
  ], [])

  const productPillars = useMemo(() => [
    { title:'API Services',        desc:'Track service health and response quality continuously.',      icon:Layers },
    { title:'Metrics & Analytics', desc:'Explore latency, availability and error trends in depth.',    icon:ChartNoAxesCombined },
    { title:'Alerts & Incidents',  desc:'Detect disruptions fast and drive response with context.',    icon:AlertTriangle },
    { title:'SLA & Reliability',   desc:'Measure commitments with clean reporting and visibility.',    icon:ShieldCheck },
    { title:'Notifications',       desc:'Route events to your channels for operational clarity.',      icon:Bell },
    { title:'Teams',               desc:'Collaborate across projects with structured ownership.',      icon:Activity },
  ], [])

  const css = `
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
    *{box-sizing:border-box;margin:0;padding:0;}
    .btn-primary{display:inline-flex;align-items:center;gap:8px;background:${C.pinkMid};color:#fff;padding:12px 26px;border-radius:7px;font-size:14px;font-weight:600;font-family:inherit;border:none;cursor:pointer;transition:background .18s,transform .15s;}
    .btn-primary:hover{filter:brightness(1.12);transform:translateY(-1px);}
    .btn-outline{display:inline-flex;align-items:center;gap:8px;background:transparent;color:${C.lavender};padding:11px 24px;border-radius:7px;font-size:14px;font-weight:600;font-family:inherit;border:1.5px solid ${C.border};cursor:pointer;transition:border-color .18s,background .18s,transform .15s;}
    .btn-outline:hover{border-color:${C.violet};background:${C.lavBg};transform:translateY(-1px);}
    .nav-link{background:none;border:none;cursor:pointer;font-family:inherit;font-size:14px;font-weight:500;color:${C.textMuted};padding:8px 14px;border-radius:6px;transition:color .15s,background .15s;}
    .nav-link:hover{color:${C.text};background:${C.surface};}
    .signal-tab{padding:6px 16px;border-radius:100px;font-size:13px;font-weight:500;font-family:inherit;border:1.5px solid ${C.border};cursor:pointer;transition:all .18s;background:transparent;color:${C.textMuted};}
    .signal-tab.active{background:${C.pinkMid};color:#fff;border-color:${C.pinkMid};}
    .signal-tab:not(.active):hover{border-color:${C.pinkMid};color:${C.pink};}
    .pillar-card{background:${C.card};border:1px solid ${C.border};border-radius:14px;padding:26px;cursor:pointer;opacity:0;transform:translateY(18px);transition:box-shadow .22s,transform .22s,border-color .22s;}
    .pillar-card.visible{opacity:1;transform:translateY(0);transition:opacity .42s ease,transform .42s ease,box-shadow .22s,border-color .22s;}
    .pillar-card:hover{border-color:${C.pinkMid};transform:translateY(-3px)!important;box-shadow:0 8px 28px ${dark ? 'rgba(224,127,160,0.12)' : 'rgba(194,84,122,0.10)'};}
    .pillar-card.active-card{border-color:${C.violet};}
    .workflow-card{background:${C.card};border:1px solid ${C.border};border-radius:14px;padding:26px 30px;transition:box-shadow .2s,border-color .2s;}
    .workflow-card:hover{border-color:${C.violet};box-shadow:0 4px 20px ${dark ? 'rgba(139,92,246,0.10)' : 'rgba(124,58,237,0.08)'};}
    .snapshot-row{display:flex;align-items:center;justify-content:space-between;padding:11px 15px;border-radius:9px;border:1px solid ${C.border};background:${dark ? C.surface : '#FAF8FF'};transition:border-color .18s,background .18s;margin-bottom:7px;cursor:default;}
    .snapshot-row:hover{border-color:${C.pinkMid};background:${C.pinkBg};}
    .trust-item{display:flex;align-items:center;gap:10px;padding:10px 20px;border-radius:8px;border:1px solid ${C.border};transition:border-color .18s,background .18s;background:${C.card};}
    .trust-item:hover{border-color:${C.violet};background:${C.lavBg};}
    .stat-card{background:${C.card};border:1px solid ${C.border};border-radius:10px;padding:16px 18px;transition:border-color .2s;}
    .stat-card:hover{border-color:${C.pinkMid};}
    .section-tag{display:inline-block;font-size:11px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:${C.lavender};background:${C.lavBg};border:1px solid ${C.border};padding:4px 13px;border-radius:100px;margin-bottom:16px;}
    .footer-link{color:${C.textMuted};font-size:14px;text-decoration:none;transition:color .15s;}
    .footer-link:hover{color:${C.pink};}
    .cta-btn-pink{display:inline-flex;align-items:center;gap:8px;background:${C.pinkMid};color:#fff;padding:13px 28px;border-radius:7px;font-size:14px;font-weight:700;font-family:inherit;border:none;cursor:pointer;transition:filter .18s,transform .15s;}
    .cta-btn-pink:hover{filter:brightness(1.12);transform:translateY(-1px);}
    .cta-btn-ghost{display:inline-flex;align-items:center;gap:8px;background:transparent;color:${dark ? C.lavender : 'rgba(255,255,255,0.85)'};padding:12px 26px;border-radius:7px;font-size:14px;font-weight:600;font-family:inherit;border:1.5px solid ${dark ? C.border : 'rgba(255,255,255,0.25)'};cursor:pointer;transition:color .18s,border-color .18s;}
    .cta-btn-ghost:hover{color:#fff;border-color:${dark ? C.lavender : 'rgba(255,255,255,0.6)'};}
    .pulse{animation:pulse-anim 2.2s ease-in-out infinite;}
    @keyframes pulse-anim{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.5;transform:scale(.75)}}
    .fade-in-up{animation:fiu .55s ease forwards;}
    @keyframes fiu{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
    ::-webkit-scrollbar{width:6px;}
    ::-webkit-scrollbar-track{background:${C.base};}
    ::-webkit-scrollbar-thumb{background:${C.border};border-radius:3px;}
    @media(max-width:768px){.hero-grid{grid-template-columns:1fr!important;}.pillars-grid{grid-template-columns:1fr 1fr!important;}.hide-sm{display:none!important;}.workflow-card{width:100%!important;}}
  `

  return (
    <div style={{ fontFamily:"'Inter',system-ui,sans-serif", background:C.base, color:C.text, lineHeight:1.6, overflowX:'hidden', transition:'background 0.3s, color 0.3s' }}>
      <style>{css}</style>

      {/* ══ NAVBAR ══ */}
      <nav style={{
        position:'fixed', top:0, left:0, right:0, zIndex:100,
        background: scrolled ? C.navBg : 'transparent',
        backdropFilter: scrolled ? 'blur(14px)' : 'none',
        borderBottom: scrolled ? `1px solid ${C.border}` : '1px solid transparent',
        transition:'all .28s',
      }}>
        <div style={{ maxWidth:1180, margin:'0 auto', padding:'0 32px', display:'flex', alignItems:'center', justifyContent:'space-between', height:66 }}>

          <div style={{ display:'flex', alignItems:'center', gap:10, cursor:'pointer' }} onClick={() => window.scrollTo({ top:0, behavior:'smooth' })}>
            <TraceonLogo size={32} />
            <div>
              <div style={{ fontSize:17, fontWeight:800, color:C.text, letterSpacing:'-0.03em', lineHeight:1.1 }}>traceon</div>
              <div style={{ fontSize:9, fontWeight:600, color:C.textSub, letterSpacing:'0.18em', textTransform:'uppercase' }}>API Supervision</div>
            </div>
          </div>

          <div className="hide-sm" style={{ display:'flex', gap:2 }}>
            {['Platform','Solutions','Docs','Pricing'].map(l => <button key={l} className="nav-link">{l}</button>)}
          </div>

          <div className="hide-sm" style={{ display:'flex', gap:10, alignItems:'center' }}>
            <ThemeToggle dark={dark} onToggle={toggleTheme} />
            <button className="nav-link" onClick={() => navigate('/login')}>Sign In</button>
            <button className="btn-primary" onClick={() => navigate('/login')}>Get Started <ArrowRight size={14}/></button>
          </div>

          <button style={{ background:'none', border:'none', cursor:'pointer', padding:6 }} onClick={() => setMobileOpen(o => !o)}>
            {mobileOpen ? <X size={22} color={C.text}/> : <Menu size={22} color={C.text}/>}
          </button>
        </div>

        {mobileOpen && (
          <div style={{ background:C.surface, borderTop:`1px solid ${C.border}`, padding:'16px 32px 24px' }}>
            {['Platform','Solutions','Docs','Pricing'].map(l => (
              <div key={l} style={{ padding:'11px 0', fontSize:15, fontWeight:500, color:C.textMuted, cursor:'pointer', borderBottom:`1px solid ${C.border}` }}>{l}</div>
            ))}
            <div style={{ marginTop:16, display:'flex', gap:10 }}>
              <button className="btn-outline" onClick={() => navigate('/login')}>Sign In</button>
              <button className="btn-primary" onClick={() => navigate('/login')}>Get Started</button>
            </div>
          </div>
        )}
      </nav>

      {/* ══ HERO ══ */}
      <section style={{ paddingTop:110, paddingBottom:88, paddingLeft:32, paddingRight:32, background:C.base, borderBottom:`1px solid ${C.border}` }}>
        <div ref={heroRef} className="hero-grid" style={{ maxWidth:1180, margin:'0 auto', display:'grid', gridTemplateColumns:'1.1fr 1fr', gap:60, alignItems:'center' }}>

          <div className="fade-in-up">
            <span className="section-tag">Enterprise API Monitoring</span>
            <h1 style={{ fontSize:'clamp(34px,4.2vw,54px)', fontWeight:800, letterSpacing:'-0.035em', lineHeight:1.1, color:C.text, marginBottom:20 }}>
              Reliability, visibility,<br/>
              <span style={{ color:C.pink }}>and control</span> for<br/>
              your APIs.
            </h1>
            <p style={{ fontSize:16, color:C.textMuted, lineHeight:1.75, maxWidth:460, marginBottom:32 }}>
              A supervision platform for modern technical teams — follow your API services, detect incidents quickly, and keep SLA performance under control.
            </p>
            <div style={{ display:'flex', gap:12, flexWrap:'wrap', marginBottom:48 }}>
              <button className="btn-primary" onClick={() => navigate('/login')}>Start Monitoring <ArrowRight size={14}/></button>
              <button className="btn-outline" onClick={() => navigate('/login')}>Access Platform</button>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12 }}>
              {[
                { value:`${counter.apis}`,               label:'APIs monitored', color:C.pink },
                { value:`${counter.checks}`,             label:'Active checks',  color:C.lavender },
                { value:`${counter.uptime.toFixed(2)}%`, label:'Avg uptime',     color:C.violet },
              ].map(item => (
                <div key={item.label} className="stat-card">
                  <div style={{ fontSize:24, fontWeight:800, color:item.color, letterSpacing:'-0.03em' }}>{item.value}</div>
                  <div style={{ fontSize:12, color:C.textSub, marginTop:3, fontWeight:500 }}>{item.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Cockpit panel */}
          <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:18, padding:26, transition:'background 0.3s, border-color 0.3s' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:18 }}>
              <div>
                <div style={{ fontSize:15, fontWeight:700, color:C.text }}>Operations cockpit</div>
                <div style={{ fontSize:12, color:C.textSub, marginTop:2 }}>Real-time platform status</div>
              </div>
              <span style={{ fontSize:11, fontWeight:700, color:C.success, background:C.successBg, padding:'4px 10px', borderRadius:100, letterSpacing:'0.06em' }}>● Live</span>
            </div>

            <div style={{ display:'flex', gap:7, marginBottom:14, flexWrap:'wrap' }}>
              {heroSignals.map((s,i) => (
                <button key={s.label} className={`signal-tab ${activeSignal===i?'active':''}`} onClick={() => setActiveSignal(i)}>{s.label}</button>
              ))}
            </div>

            <div style={{ background:C.surface, borderRadius:12, padding:'18px 20px', border:`1px solid ${C.border}`, marginBottom:14 }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:10 }}>
                <div>
                  <div style={{ fontSize:11, fontWeight:700, color:C.textSub, letterSpacing:'0.12em', textTransform:'uppercase', marginBottom:5 }}>{heroSignals[activeSignal].label}</div>
                  <div style={{ fontSize:32, fontWeight:800, color:C.text, letterSpacing:'-0.03em' }}>{heroSignals[activeSignal].value}</div>
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:5, background:heroSignals[activeSignal].good ? C.successBg : C.warnBg, padding:'5px 12px', borderRadius:100 }}>
                  {heroSignals[activeSignal].good ? <TrendingDown size={13} color={C.success}/> : <TrendingUp size={13} color={C.warn}/>}
                  <span style={{ fontSize:13, fontWeight:700, color:heroSignals[activeSignal].good ? C.success : C.warn }}>{heroSignals[activeSignal].trend}</span>
                </div>
              </div>
              <div style={{ fontSize:13, color:C.textMuted, marginBottom:14 }}>{heroSignals[activeSignal].detail}</div>
              <SparkBars color={heroSignals[activeSignal].good ? C.violet : C.pinkMid} values={heroSignals[activeSignal].bars}/>
            </div>

            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:14 }}>
              {[{ label:'Monitored APIs', value:'27', color:C.pink },{ label:'Active checks', value:'146', color:C.lavender }].map(item => (
                <div key={item.label} style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:9, padding:'13px 15px' }}>
                  <div style={{ fontSize:11, fontWeight:600, color:C.textSub, textTransform:'uppercase', letterSpacing:'0.1em' }}>{item.label}</div>
                  <div style={{ fontSize:22, fontWeight:800, color:item.color, marginTop:3 }}>{item.value}</div>
                </div>
              ))}
            </div>

            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
              <div style={{ fontSize:14, fontWeight:600, color:C.text }}>Live Platform Snapshot</div>
              <span style={{ fontSize:11, fontWeight:700, color:C.success, background:C.successBg, padding:'3px 10px', borderRadius:100 }}>Stable</span>
            </div>
            {[
              { label:'Global API health', value:'98.7%', good:true },
              { label:'Active alerts',     value:'03',    good:false },
              { label:'Open incidents',    value:'01',    good:false },
              { label:'SLA this month',    value:'99.95%',good:true },
            ].map(item => (
              <div className="snapshot-row" key={item.label}>
                <span style={{ fontSize:13, color:C.textMuted }}>{item.label}</span>
                <div style={{ display:'flex', alignItems:'center', gap:9 }}>
                  <span style={{ fontSize:14, fontWeight:700, color:C.text }}>{item.value}</span>
                  <span className="pulse" style={{ width:8, height:8, borderRadius:'50%', background:item.good ? C.success : C.warn, display:'inline-block' }}/>
                </div>
              </div>
            ))}

            <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:9, padding:'13px 15px', marginTop:8 }}>
              <div style={{ fontSize:11, fontWeight:700, color:C.textSub, textTransform:'uppercase', letterSpacing:'0.12em', marginBottom:9, display:'flex', alignItems:'center', gap:6 }}>
                <ChartNoAxesCombined size={12} color={C.textSub}/> Event Timeline
              </div>
              {[['Auth service recovered','2m ago'],['Webhook queue normalized','7m ago']].map(([evt,t]) => (
                <div key={evt} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', fontSize:13, marginBottom:5 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:7 }}>
                    <CheckCircle2 size={13} color={C.success}/>
                    <span style={{ color:C.text }}>{evt}</span>
                  </div>
                  <span style={{ color:C.textSub, fontSize:12 }}>{t}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ══ TRUST BAR ══ */}
      <div style={{ background:C.surface, borderBottom:`1px solid ${C.border}`, padding:'18px 32px', transition:'background 0.3s' }}>
        <div style={{ maxWidth:1180, margin:'0 auto', display:'flex', justifyContent:'center', gap:14, flexWrap:'wrap' }}>
          {[{ icon:Globe, label:'99.99% uptime SLA' },{ icon:Zap, label:'Sub-100ms monitoring' },{ icon:Lock, label:'Enterprise-grade security' },{ icon:Activity, label:'Real-time observability' }].map(item => (
            <div key={item.label} className="trust-item">
              <item.icon size={15} color={C.violet}/>
              <span style={{ fontSize:13, fontWeight:600, color:C.textMuted }}>{item.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ══ WORKFLOW ══ */}
      <section ref={workflowRef} style={{ padding:'96px 32px', background:C.base, borderBottom:`1px solid ${C.border}`, transition:'background 0.3s' }}>
        <div style={{ maxWidth:1180, margin:'0 auto' }}>
          <div style={{ textAlign:'center', marginBottom:68 }}>
            <span className="section-tag">Operational workflow</span>
            <h2 style={{ fontSize:'clamp(26px,3.2vw,38px)', fontWeight:800, color:C.text, letterSpacing:'-0.03em', marginBottom:12 }}>Your supervision cycle in 5 steps</h2>
            <p style={{ fontSize:15, color:C.textMuted, maxWidth:440, margin:'0 auto' }}>From observability to SLA validation — a complete operational loop for your APIs.</p>
          </div>
          <div style={{ position:'relative' }}>
            <div className="hide-sm" style={{ position:'absolute', left:'50%', top:0, bottom:0, width:2, background:C.border, transform:'translateX(-50%)' }}/>
            <div className="hide-sm" style={{ position:'absolute', left:'50%', top:0, height:`${flowProgress*100}%`, width:2, background:C.pinkMid, transform:'translateX(-50%)', transition:'height 0.08s linear' }}/>
            <div style={{ display:'flex', flexDirection:'column', gap:32 }}>
              {workflowSteps.map(step => (
                <div key={step.id} style={{ display:'flex', justifyContent:step.right?'flex-end':'flex-start', position:'relative' }}>
                  <div className="hide-sm" style={{ position:'absolute', left:'50%', top:'50%', transform:'translate(-50%,-50%)', width:13, height:13, borderRadius:'50%', background:C.pinkMid, border:`3px solid ${C.base}`, outline:`2px solid ${C.pinkMid}`, zIndex:2 }}/>
                  <div className="workflow-card" style={{ width:'44%' }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:12 }}>
                      <span style={{ fontSize:11, fontWeight:700, color:C.pink, letterSpacing:'0.14em', textTransform:'uppercase' }}>{step.id}</span>
                      <div style={{ width:38, height:38, borderRadius:9, background:C.lavBg, border:`1px solid ${C.border}`, display:'flex', alignItems:'center', justifyContent:'center' }}>
                        <step.icon size={17} color={C.lavender}/>
                      </div>
                    </div>
                    <h3 style={{ fontSize:16, fontWeight:700, color:C.text, marginBottom:7 }}>{step.title}</h3>
                    <p style={{ fontSize:13, color:C.textMuted, lineHeight:1.65 }}>{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ══ PILLARS ══ */}
      <section style={{ padding:'96px 32px', background:C.surface, borderBottom:`1px solid ${C.border}`, transition:'background 0.3s' }}>
        <div style={{ maxWidth:1180, margin:'0 auto' }}>
          <div style={{ marginBottom:56 }}>
            <span className="section-tag">Product modules</span>
            <h2 style={{ fontSize:'clamp(24px,3vw,36px)', fontWeight:800, color:C.text, maxWidth:620, letterSpacing:'-0.03em', marginBottom:14, lineHeight:1.2 }}>Built to supervise operations end-to-end.</h2>
            <p style={{ fontSize:15, color:C.textMuted, maxWidth:500 }}>From API performance to incident response — clear architecture and meaningful interactions to support daily platform use.</p>
          </div>
          <div ref={pillarsRef} className="pillars-grid" style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:18 }}>
            {productPillars.map((item,idx) => (
              <div key={item.title} data-idx={idx}
                className={`pillar-card ${visibleCards.has(idx)?'visible':''} ${activePillar===idx?'active-card':''}`}
                style={{ transitionDelay:`${idx*0.07}s` }}
                onClick={() => setActivePillar(activePillar===idx ? null : idx)}
              >
                <div style={{ width:44, height:44, borderRadius:11, background:activePillar===idx ? C.pinkBg : C.lavBg, border:`1px solid ${activePillar===idx ? C.pinkMid : C.border}`, display:'flex', alignItems:'center', justifyContent:'center', marginBottom:18, transition:'all .2s' }}>
                  <item.icon size={19} color={activePillar===idx ? C.pink : C.lavender}/>
                </div>
                <h3 style={{ fontSize:15, fontWeight:700, color:C.text, marginBottom:8 }}>{item.title}</h3>
                <p style={{ fontSize:13, color:C.textMuted, lineHeight:1.65, marginBottom:activePillar===idx?14:0 }}>{item.desc}</p>
                {activePillar===idx && (
                  <div style={{ borderTop:`1px solid ${C.border}`, paddingTop:12, display:'flex', alignItems:'center', gap:6, color:C.pink, fontSize:13, fontWeight:600 }}>
                    Learn more <ChevronRight size={14}/>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ CTA ══ */}
      <section style={{ padding:'80px 32px', background:C.base, borderBottom:`1px solid ${C.border}` }}>
        <div style={{ maxWidth:1180, margin:'0 auto' }}>
          <div style={{ background:C.ctaBg, border:`1px solid ${C.border}`, borderRadius:20, padding:'52px 60px', display:'flex', alignItems:'center', justifyContent:'space-between', gap:36, flexWrap:'wrap' }}>
            <div style={{ position:'relative', maxWidth:560 }}>
              <div style={{ width:3, height:48, background:C.pinkMid, borderRadius:2, position:'absolute', left:-28, top:4 }}/>
              <span style={{ fontSize:11, fontWeight:700, color:C.lavender, letterSpacing:'0.14em', textTransform:'uppercase', display:'block', marginBottom:14 }}>Ready to launch</span>
              <h3 style={{ fontSize:'clamp(20px,2.6vw,32px)', fontWeight:800, color:'#fff', letterSpacing:'-0.025em', marginBottom:12, lineHeight:1.2 }}>
                Bring production-grade supervision<br/>to your API stack.
              </h3>
              <p style={{ fontSize:15, color:'rgba(255,255,255,0.55)', lineHeight:1.7 }}>Configure projects, define alerting strategy, and centralize reliability monitoring in minutes.</p>
            </div>
            <div style={{ display:'flex', gap:12, flexWrap:'wrap' }}>
              <button className="cta-btn-pink" onClick={() => navigate('/login')}>Open Platform <ArrowRight size={15}/></button>
              <button className="cta-btn-ghost" onClick={() => navigate('/login')}>View Docs</button>
            </div>
          </div>
        </div>
      </section>

      {/* ══ FOOTER ══ */}
      <footer style={{ background:C.footerBg, borderTop:`1px solid ${C.border}`, padding:'48px 32px 28px', transition:'background 0.3s' }}>
        <div style={{ maxWidth:1180, margin:'0 auto' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:36, marginBottom:40 }}>
            <div>
              <div style={{ display:'flex', alignItems:'center', gap:9, marginBottom:12 }}>
                <TraceonLogo size={28}/>
                <div>
                  <div style={{ fontSize:15, fontWeight:800, color:C.text, letterSpacing:'-0.02em' }}>traceon</div>
                  <div style={{ fontSize:9, color:C.textSub, letterSpacing:'0.18em', textTransform:'uppercase' }}>API Supervision</div>
                </div>
              </div>
              <p style={{ fontSize:13, color:C.textSub, maxWidth:220, lineHeight:1.65 }}>Enterprise API monitoring platform for modern technical teams.</p>
            </div>
            <div style={{ display:'flex', gap:56, flexWrap:'wrap' }}>
              {[
                { title:'Platform', links:['API Services','Metrics','Alerts','Incidents','SLA Reports'] },
                { title:'Company',  links:['About','Documentation','Support','Contact'] },
                { title:'Legal',    links:['Privacy Policy','Terms of Service','Cookies'] },
              ].map(col => (
                <div key={col.title}>
                  <div style={{ fontSize:11, fontWeight:700, color:C.lavender, letterSpacing:'0.1em', textTransform:'uppercase', marginBottom:14 }}>{col.title}</div>
                  {col.links.map(link => <div key={link} style={{ marginBottom:9 }}><a href="#" className="footer-link">{link}</a></div>)}
                </div>
              ))}
            </div>
          </div>
          <div style={{ borderTop:`1px solid ${C.border}`, paddingTop:22, display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:10 }}>
            <p style={{ fontSize:13, color:C.textSub }}>© 2026 Traceon. All rights reserved.</p>
            <div style={{ display:'flex', gap:22 }}>
              <a href="#" className="footer-link">Privacy</a>
              <a href="#" className="footer-link">Legal notice</a>
              <a href="#" className="footer-link">Sitemap</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default LandingPage