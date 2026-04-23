import React, { useEffect, useState } from 'react'
import { Plus, AlertTriangle, CheckCircle2, Clock3, Shield, ChevronRight } from 'lucide-react'
import { Layout }        from '../components/layout/Layout'
import { Header }        from '../components/layout/Header'
import { Button }        from '../components/ui/Button'
import { Modal }         from '../components/ui/Modal'
import { Input, Select } from '../components/ui/Input'
import { incidentsService }   from '../services/incidents.service'
import { apiServicesService } from '../services/apiServices.service'
import type { Incident, ApiService } from '../types'

const STATUT_FR: Record<string, string> = {
  OPEN:     'Ouvert',
  RESOLVED: 'Résolu',
}

const PRIORITE_FR: Record<string, string> = {
  OPEN:     'Haute',
  RESOLVED: 'Clôturé',
}

export const IncidentsPage: React.FC = () => {
  const [incidents,     setIncidents]     = useState<Incident[]>([])
  const [services,      setServices]      = useState<ApiService[]>([])
  const [loading,       setLoading]       = useState(true)
  const [showCreate,    setShowCreate]    = useState(false)
  const [showResolve,   setShowResolve]   = useState(false)
  const [selectedId,    setSelectedId]    = useState('')
  const [actionLoading, setActionLoading] = useState(false)
  const [createForm,    setCreateForm]    = useState({ title: '', api_service_id: '' })
  const [resolution,    setResolution]    = useState('')

  useEffect(() => { loadAll() }, [])

  const loadAll = async () => {
    setLoading(true)
    try {
      const [inc, svcs] = await Promise.all([
        incidentsService.getAll(),
        apiServicesService.getAll(),
      ])
      setIncidents(inc)
      setServices(svcs)
      if (svcs.length > 0) setCreateForm(f => ({ ...f, api_service_id: svcs[0].id }))
    } finally { setLoading(false) }
  }

  const handleCreate = async () => {
    setActionLoading(true)
    try {
      await incidentsService.create({ title: createForm.title, api_service_id: createForm.api_service_id })
      setShowCreate(false)
      setCreateForm({ title: '', api_service_id: services[0]?.id ?? '' })
      await loadAll()
    } finally { setActionLoading(false) }
  }

  const openResolve = (id: string) => { setSelectedId(id); setResolution(''); setShowResolve(true) }

  const handleResolve = async () => {
    if (!resolution.trim()) return
    setActionLoading(true)
    try {
      await incidentsService.resolve(selectedId, resolution)
      setShowResolve(false)
      setResolution('')
      await loadAll()
    } finally { setActionLoading(false) }
  }

  const formatDuration = (incident: Incident): string => {
    if (!incident.end_time) return 'En cours'
    if (incident.duration_minutes === null) return '–'
    const m = incident.duration_minutes
    if (m < 60) return `${Math.round(m)} min`
    return `${(m / 60).toFixed(1)} h`
  }

  const getServiceName = (id: string) => services.find(s => s.id === id)?.name ?? '–'
  const openCount     = incidents.filter(i => i.status === 'OPEN').length
  const resolvedCount = incidents.filter(i => i.status === 'RESOLVED').length

  return (
    <Layout>
      <Header
        title="Gestion des incidents"
        subtitle="Suivi et résolution des incidents de service en temps réel"
        actions={
          <Button icon={Plus} onClick={() => setShowCreate(true)}>
            Déclarer un incident
          </Button>
        }
      />

      <div style={{ padding: '28px 36px', minHeight: '100%' }}>

        {/* ── Cartes statistiques ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '32px' }}>

          {/* Total */}
          <div style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: '16px', padding: '24px',
            position: 'relative', overflow: 'hidden',
          }}>
            <div style={{
              position: 'absolute', top: '-20px', right: '-20px',
              width: '80px', height: '80px', borderRadius: '50%',
              background: 'rgba(99,102,241,0.08)',
            }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <div style={{
                width: '40px', height: '40px', borderRadius: '10px',
                background: 'rgba(99,102,241,0.15)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Shield size={18} color="#818cf8" />
              </div>
              <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Total incidents
              </span>
            </div>
            <p style={{ margin: 0, fontSize: '36px', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'monospace' }}>
              {loading ? '–' : incidents.length}
            </p>
            <p style={{ margin: '6px 0 0', fontSize: '12px', color: 'var(--text-subtle)' }}>
              Depuis le début du suivi
            </p>
          </div>

          {/* Actifs */}
          <div style={{
            background: openCount > 0 ? 'rgba(239,68,68,0.05)' : 'var(--bg-card)',
            border: `1px solid ${openCount > 0 ? 'rgba(239,68,68,0.25)' : 'var(--border)'}`,
            borderRadius: '16px', padding: '24px',
            position: 'relative', overflow: 'hidden',
          }}>
            <div style={{
              position: 'absolute', top: '-20px', right: '-20px',
              width: '80px', height: '80px', borderRadius: '50%',
              background: openCount > 0 ? 'rgba(239,68,68,0.08)' : 'rgba(99,102,241,0.05)',
            }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <div style={{
                width: '40px', height: '40px', borderRadius: '10px',
                background: openCount > 0 ? 'rgba(239,68,68,0.15)' : 'rgba(99,102,241,0.1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <AlertTriangle size={18} color={openCount > 0 ? '#f87171' : 'var(--text-muted)'} />
              </div>
              <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Incidents actifs
              </span>
            </div>
            <p style={{ margin: 0, fontSize: '36px', fontWeight: 700, color: openCount > 0 ? '#f87171' : 'var(--text-primary)', fontFamily: 'monospace' }}>
              {loading ? '–' : openCount}
            </p>
            <p style={{ margin: '6px 0 0', fontSize: '12px', color: openCount > 0 ? '#f87171' : 'var(--text-subtle)' }}>
              {openCount > 0 ? 'Intervention requise' : 'Aucun incident actif'}
            </p>
          </div>

          {/* Résolus */}
          <div style={{
            background: 'rgba(16,185,129,0.05)',
            border: '1px solid rgba(16,185,129,0.2)',
            borderRadius: '16px', padding: '24px',
            position: 'relative', overflow: 'hidden',
          }}>
            <div style={{
              position: 'absolute', top: '-20px', right: '-20px',
              width: '80px', height: '80px', borderRadius: '50%',
              background: 'rgba(16,185,129,0.06)',
            }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <div style={{
                width: '40px', height: '40px', borderRadius: '10px',
                background: 'rgba(16,185,129,0.15)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <CheckCircle2 size={18} color="#34d399" />
              </div>
              <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Résolus
              </span>
            </div>
            <p style={{ margin: 0, fontSize: '36px', fontWeight: 700, color: '#34d399', fontFamily: 'monospace' }}>
              {loading ? '–' : resolvedCount}
            </p>
            <p style={{ margin: '6px 0 0', fontSize: '12px', color: 'var(--text-subtle)' }}>
              Taux de résolution : {incidents.length > 0 ? Math.round(resolvedCount / incidents.length * 100) : 0}%
            </p>
          </div>
        </div>

        {/* ── Tableau des incidents ── */}
        <div style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: '16px', overflow: 'hidden',
        }}>
          {/* En-tête */}
          <div style={{
            padding: '20px 28px', borderBottom: '1px solid var(--border)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>
                Journal des incidents
              </h3>
              <p style={{ margin: '4px 0 0', fontSize: '12px', color: 'var(--text-muted)' }}>
                {incidents.length} incident{incidents.length > 1 ? 's' : ''} enregistré{incidents.length > 1 ? 's' : ''}
              </p>
            </div>
            {openCount > 0 && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                padding: '6px 14px', borderRadius: '20px',
                background: 'rgba(239,68,68,0.1)',
                border: '1px solid rgba(239,68,68,0.2)',
              }}>
                <div style={{
                  width: '7px', height: '7px', borderRadius: '50%',
                  background: '#ef4444', boxShadow: '0 0 6px #ef4444',
                }} />
                <span style={{ fontSize: '12px', fontWeight: 600, color: '#f87171' }}>
                  {openCount} actif{openCount > 1 ? 's' : ''}
                </span>
              </div>
            )}
          </div>

          {/* En-têtes colonnes */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '2fr 160px 140px 110px 100px 130px',
            padding: '12px 28px',
            borderBottom: '1px solid var(--border)',
            background: 'var(--bg-secondary)',
          }}>
            {['Incident', 'API impactée', 'Statut', 'Durée', 'Priorité', 'Action'].map(h => (
              <span key={h} style={{
                fontSize: '11px', fontWeight: 600,
                color: 'var(--text-subtle)',
                textTransform: 'uppercase', letterSpacing: '0.08em',
              }}>
                {h}
              </span>
            ))}
          </div>

          {/* Contenu */}
          {loading ? (
            <div style={{ padding: '20px 28px' }}>
              {[...Array(4)].map((_, i) => (
                <div key={i} className="skeleton"
                  style={{ height: '64px', marginBottom: '10px', borderRadius: '10px' }} />
              ))}
            </div>

          ) : incidents.length === 0 ? (
            <div style={{ padding: '72px 28px', textAlign: 'center' }}>
              <div style={{
                width: '64px', height: '64px', borderRadius: '16px',
                background: 'rgba(99,102,241,0.1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 16px',
              }}>
                <Shield size={28} color="#818cf8" />
              </div>
              <h4 style={{ margin: '0 0 8px', fontSize: '15px', fontWeight: 600, color: 'var(--text-muted)' }}>
                Aucun incident enregistré
              </h4>
              <p style={{ margin: '0 0 20px', fontSize: '13px', color: 'var(--text-subtle)' }}>
                Tous les systèmes fonctionnent normalement
              </p>
              <Button icon={Plus} size="sm" variant="secondary" onClick={() => setShowCreate(true)}>
                Déclarer un incident
              </Button>
            </div>

          ) : (
            incidents.map((incident, index) => (
              <div
                key={incident.id}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '2fr 160px 140px 110px 100px 130px',
                  padding: '16px 28px',
                  borderBottom: index < incidents.length - 1 ? '1px solid var(--border)' : 'none',
                  alignItems: 'center',
                  background: incident.status === 'OPEN' ? 'rgba(239,68,68,0.02)' : 'transparent',
                  transition: 'background 0.2s',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--hover-bg)')}
                onMouseLeave={e => (e.currentTarget.style.background =
                  incident.status === 'OPEN' ? 'rgba(239,68,68,0.02)' : 'transparent'
                )}
              >
                {/* Titre + horodatage */}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                  <div style={{
                    width: '8px', height: '8px', borderRadius: '50%',
                    marginTop: '5px', flexShrink: 0,
                    background: incident.status === 'OPEN' ? '#ef4444' : '#10b981',
                    boxShadow: incident.status === 'OPEN' ? '0 0 6px rgba(239,68,68,0.5)' : 'none',
                  }} />
                  <div>
                    <p style={{ margin: 0, fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)' }}>
                      {incident.title}
                    </p>
                    <p style={{ margin: '3px 0 0', fontSize: '11px', color: 'var(--text-subtle)' }}>
                      Ouvert le {new Date(incident.start_time).toLocaleString('fr-FR', {
                        day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
                      })}
                    </p>
                  </div>
                </div>

                {/* API */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#6366f1', flexShrink: 0 }} />
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 500 }}>
                    {getServiceName(incident.api_service_id)}
                  </span>
                </div>

                {/* Statut */}
                <div>
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: '6px',
                    padding: '4px 12px', borderRadius: '6px',
                    fontSize: '11px', fontWeight: 600,
                    background: incident.status === 'OPEN' ? 'rgba(239,68,68,0.12)' : 'rgba(16,185,129,0.12)',
                    color: incident.status === 'OPEN' ? '#fca5a5' : '#6ee7b7',
                    border: `1px solid ${incident.status === 'OPEN' ? 'rgba(239,68,68,0.2)' : 'rgba(16,185,129,0.2)'}`,
                  }}>
                    {incident.status === 'OPEN' ? <AlertTriangle size={10} /> : <CheckCircle2 size={10} />}
                    {STATUT_FR[incident.status] || incident.status}
                  </span>
                </div>

                {/* Durée */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Clock3 size={12} color="var(--text-subtle)" />
                  <span style={{
                    fontSize: '12px', fontFamily: 'monospace', fontWeight: 500,
                    color: incident.status === 'OPEN' ? '#fbbf24' : 'var(--text-muted)',
                  }}>
                    {formatDuration(incident)}
                  </span>
                </div>

                {/* Priorité */}
                <div>
                  <span style={{
                    display: 'inline-block', padding: '3px 10px', borderRadius: '4px',
                    fontSize: '10px', fontWeight: 700, letterSpacing: '0.05em',
                    background: incident.status === 'OPEN' ? 'rgba(239,68,68,0.15)' : 'rgba(107,114,128,0.15)',
                    color: incident.status === 'OPEN' ? '#f87171' : 'var(--text-muted)',
                  }}>
                    {PRIORITE_FR[incident.status] || incident.status}
                  </span>
                </div>

                {/* Action */}
                <div>
                  {incident.status === 'OPEN' ? (
                    <button
                      onClick={() => openResolve(incident.id)}
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: '6px',
                        padding: '7px 14px', borderRadius: '8px', cursor: 'pointer',
                        background: 'rgba(16,185,129,0.1)',
                        border: '1px solid rgba(16,185,129,0.25)',
                        color: '#34d399', fontSize: '12px', fontWeight: 600,
                        fontFamily: 'Sora, sans-serif', transition: 'all 0.2s',
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.background = 'rgba(16,185,129,0.2)'
                        e.currentTarget.style.borderColor = 'rgba(16,185,129,0.4)'
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.background = 'rgba(16,185,129,0.1)'
                        e.currentTarget.style.borderColor = 'rgba(16,185,129,0.25)'
                      }}
                    >
                      Résoudre <ChevronRight size={12} />
                    </button>
                  ) : (
                    <span style={{ fontSize: '11px', color: 'var(--text-subtle)', fontStyle: 'italic' }}>
                      Clôturé
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* ── Modale : Déclarer ── */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Déclarer un incident">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <Input
            label="Titre de l'incident"
            value={createForm.title}
            onChange={e => setCreateForm(f => ({ ...f, title: e.target.value }))}
            placeholder="Ex : API Paiement indisponible"
          />
          <Select
            label="API impactée"
            value={createForm.api_service_id}
            onChange={e => setCreateForm(f => ({ ...f, api_service_id: e.target.value }))}
            options={services.map(s => ({ value: s.id, label: s.name }))}
          />
          <div style={{ display: 'flex', gap: '12px', paddingTop: '8px' }}>
            <Button variant="secondary" onClick={() => setShowCreate(false)} style={{ flex: 1 }}>Annuler</Button>
            <Button onClick={handleCreate} loading={actionLoading} disabled={!createForm.title || !createForm.api_service_id} style={{ flex: 1 }}>
              Déclarer l'incident
            </Button>
          </div>
        </div>
      </Modal>

      {/* ── Modale : Résoudre ── */}
      <Modal open={showResolve} onClose={() => setShowResolve(false)} title="Résoudre l'incident">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)', lineHeight: '1.6' }}>
            Décrivez la cause racine et la solution appliquée pour clôturer définitivement l'incident.
          </p>
          <Input
            label="Rapport de résolution"
            value={resolution}
            onChange={e => setResolution(e.target.value)}
            placeholder="Ex : Redémarrage du serveur de base de données après saturation mémoire"
          />
          <div style={{ display: 'flex', gap: '12px', paddingTop: '8px' }}>
            <Button variant="secondary" onClick={() => setShowResolve(false)} style={{ flex: 1 }}>Annuler</Button>
            <Button onClick={handleResolve} loading={actionLoading} disabled={!resolution.trim()} style={{ flex: 1 }}>
              Marquer comme résolu
            </Button>
          </div>
        </div>
      </Modal>
    </Layout>
  )
}