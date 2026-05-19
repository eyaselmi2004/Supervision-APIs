import React, { useEffect, useState } from 'react'
import {
  Plus,
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Shield,
  ChevronRight,
  BrainCircuit,
  Copy,
  X,
} from 'lucide-react'
import { Layout } from '../components/layout/Layout'
import { Header } from '../components/layout/Header'
import { Button } from '../components/ui/Button'
import { Modal } from '../components/ui/Modal'
import { Input, Select } from '../components/ui/Input'
import { incidentsService } from '../services/incidents.service'
import { apiServicesService } from '../services/apiServices.service'
import { llmService } from '../services/llm.service'
import type { Incident, ApiService } from '../types'

const STATUT_FR: Record<string, string> = {
  OPEN: 'Ouvert',
  RESOLVED: 'Résolu',
}

const PRIORITE_FR: Record<string, string> = {
  OPEN: 'Haute',
  RESOLVED: 'Clôturé',
}


type AiSection = {
  title: string
  content: string[]
}

const parseAiAnalysis = (analysis: string): AiSection[] => {
  if (!analysis.trim()) return []

  const lines = analysis
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)

  const sections: AiSection[] = []
  let current: AiSection | null = null

  lines.forEach((line) => {
    const titleMatch = line.match(/^\d+[.)]\s*(.+?)\s*:?$/)

    if (titleMatch) {
      if (current) sections.push(current)
      current = {
        title: titleMatch[1],
        content: [],
      }
      return
    }

    if (!current) {
      current = {
        title: 'Analyse',
        content: [],
      }
    }

    current.content.push(line.replace(/^[-•]\s*/, ''))
  })

  if (current) sections.push(current)

  return sections
}

const getSectionTone = (title: string) => {
  const normalized = title.toLowerCase()

  if (normalized.includes('cause')) return { color: '#f59e0b', bg: 'rgba(245,158,11,0.09)', border: 'rgba(245,158,11,0.24)' }
  if (normalized.includes('impact') || normalized.includes('sévérité')) return { color: '#ef4444', bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.22)' }
  if (normalized.includes('résolution') || normalized.includes('recommand') || normalized.includes('prévention')) return { color: '#34d399', bg: 'rgba(52,211,153,0.08)', border: 'rgba(52,211,153,0.22)' }
  if (normalized.includes('confirm')) return { color: '#60a5fa', bg: 'rgba(96,165,250,0.08)', border: 'rgba(96,165,250,0.22)' }

  return { color: '#d946ef', bg: 'rgba(217,70,239,0.08)', border: 'rgba(217,70,239,0.22)' }
}

export const IncidentsPage: React.FC = () => {
  const [incidents, setIncidents] = useState<Incident[]>([])
  const [services, setServices] = useState<ApiService[]>([])
  const [loading, setLoading] = useState(true)

  const [showCreate, setShowCreate] = useState(false)
  const [showResolve, setShowResolve] = useState(false)
  const [showAiModal, setShowAiModal] = useState(false)

  const [selectedId, setSelectedId] = useState('')
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null)

  const [actionLoading, setActionLoading] = useState(false)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiAnalysis, setAiAnalysis] = useState('')
  const [aiError, setAiError] = useState('')

  const [createForm, setCreateForm] = useState({
    title: '',
    api_service_id: '',
  })

  const [resolution, setResolution] = useState('')

  useEffect(() => {
    loadAll()
  }, [])

  const loadAll = async () => {
    setLoading(true)

    try {
      const [inc, svcs] = await Promise.all([
        incidentsService.getAll(),
        apiServicesService.getAll(),
      ])

      setIncidents(inc)
      setServices(svcs)

      if (svcs.length > 0) {
        setCreateForm((f) => ({
          ...f,
          api_service_id: svcs[0].id,
        }))
      }
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async () => {
    setActionLoading(true)

    try {
      await incidentsService.create({
        title: createForm.title,
        api_service_id: createForm.api_service_id,
      })

      setShowCreate(false)
      setCreateForm({
        title: '',
        api_service_id: services[0]?.id ?? '',
      })

      await loadAll()
    } finally {
      setActionLoading(false)
    }
  }

  const openResolve = (incident: Incident) => {
    setSelectedId(incident.id)
    setSelectedIncident(incident)
    setResolution('')
    setShowResolve(true)
  }

  const handleResolve = async () => {
    if (!resolution.trim()) return

    setActionLoading(true)

    try {
      await incidentsService.resolve(selectedId, resolution)
      setShowResolve(false)
      setResolution('')
      await loadAll()
    } finally {
      setActionLoading(false)
    }
  }

  const openAiAnalysis = async (incident: Incident) => {
    setSelectedIncident(incident)
    setSelectedId(incident.id)
    setAiAnalysis('')
    setAiError('')
    setShowAiModal(true)
    setAiLoading(true)

    try {
      const result = await llmService.explainIncident(incident.id)
      setAiAnalysis(result.analysis)
    } catch (error: any) {
      console.error('AI incident analysis error:', error)
      setAiError(
        error?.response?.data?.detail ||
          error?.message ||
          "Impossible de générer l'analyse IA de l'incident.",
      )
    } finally {
      setAiLoading(false)
    }
  }

  const handleCopyAiAnalysis = async () => {
    if (!aiAnalysis) return

    try {
      await navigator.clipboard.writeText(aiAnalysis)
    } catch (error) {
      console.error('Copy failed:', error)
    }
  }

  const formatDuration = (incident: Incident): string => {
    if (!incident.end_time) return 'En cours'
    if (incident.duration_minutes === null) return '–'

    const minutes = incident.duration_minutes

    if (minutes < 60) return `${Math.round(minutes)} min`

    return `${(minutes / 60).toFixed(1)} h`
  }

  const formatDate = (date?: string | null): string => {
    if (!date) return '–'

    return new Date(date).toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const getServiceName = (id: string) => {
    return services.find((service) => service.id === id)?.name ?? '–'
  }

  const openCount = incidents.filter((incident) => incident.status === 'OPEN').length
  const resolvedCount = incidents.filter((incident) => incident.status === 'RESOLVED').length
  const aiSections = parseAiAnalysis(aiAnalysis)

  return (
    <Layout>
      <Header
        title="Gestion des incidents"
        subtitle="Suivi, analyse IA et résolution des incidents de service"
        actions={
          <Button icon={Plus} onClick={() => setShowCreate(true)}>
            Déclarer un incident
          </Button>
        }
      />

      <div style={{ padding: '28px 36px', minHeight: '100%' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '20px',
            marginBottom: '32px',
          }}
        >
          <div
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: '16px',
              padding: '24px',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                marginBottom: '16px',
              }}
            >
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '10px',
                  background: 'rgba(99,102,241,0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Shield size={18} color="#818cf8" />
              </div>

              <span
                style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  color: 'var(--text-muted)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                }}
              >
                Total incidents
              </span>
            </div>

            <p
              style={{
                margin: 0,
                fontSize: '36px',
                fontWeight: 700,
                color: 'var(--text-primary)',
                fontFamily: 'monospace',
              }}
            >
              {loading ? '–' : incidents.length}
            </p>

            <p
              style={{
                margin: '6px 0 0',
                fontSize: '12px',
                color: 'var(--text-subtle)',
              }}
            >
              Depuis le début du suivi
            </p>
          </div>

          <div
            style={{
              background: openCount > 0 ? 'rgba(239,68,68,0.05)' : 'var(--bg-card)',
              border: `1px solid ${
                openCount > 0 ? 'rgba(239,68,68,0.25)' : 'var(--border)'
              }`,
              borderRadius: '16px',
              padding: '24px',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                marginBottom: '16px',
              }}
            >
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '10px',
                  background:
                    openCount > 0 ? 'rgba(239,68,68,0.15)' : 'rgba(99,102,241,0.12)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <AlertTriangle
                  size={18}
                  color={openCount > 0 ? '#f87171' : 'var(--text-muted)'}
                />
              </div>

              <span
                style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  color: 'var(--text-muted)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                }}
              >
                Incidents actifs
              </span>
            </div>

            <p
              style={{
                margin: 0,
                fontSize: '36px',
                fontWeight: 700,
                color: openCount > 0 ? '#f87171' : 'var(--text-primary)',
                fontFamily: 'monospace',
              }}
            >
              {loading ? '–' : openCount}
            </p>

            <p
              style={{
                margin: '6px 0 0',
                fontSize: '12px',
                color: openCount > 0 ? '#f87171' : 'var(--text-subtle)',
              }}
            >
              {openCount > 0 ? 'Intervention requise' : 'Aucun incident actif'}
            </p>
          </div>

          <div
            style={{
              background: 'rgba(16,185,129,0.05)',
              border: '1px solid rgba(16,185,129,0.2)',
              borderRadius: '16px',
              padding: '24px',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                marginBottom: '16px',
              }}
            >
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '10px',
                  background: 'rgba(16,185,129,0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <CheckCircle2 size={18} color="#34d399" />
              </div>

              <span
                style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  color: 'var(--text-muted)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                }}
              >
                Résolus
              </span>
            </div>

            <p
              style={{
                margin: 0,
                fontSize: '36px',
                fontWeight: 700,
                color: '#34d399',
                fontFamily: 'monospace',
              }}
            >
              {loading ? '–' : resolvedCount}
            </p>

            <p
              style={{
                margin: '6px 0 0',
                fontSize: '12px',
                color: 'var(--text-subtle)',
              }}
            >
              Taux de résolution :{' '}
              {incidents.length > 0 ? Math.round((resolvedCount / incidents.length) * 100) : 0}%
            </p>
          </div>
        </div>

        <div
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: '16px',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              padding: '20px 28px',
              borderBottom: '1px solid var(--border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <h3
                style={{
                  margin: 0,
                  fontSize: '15px',
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                }}
              >
                Journal des incidents
              </h3>

              <p
                style={{
                  margin: '4px 0 0',
                  fontSize: '12px',
                  color: 'var(--text-muted)',
                }}
              >
                {incidents.length} incident{incidents.length > 1 ? 's' : ''} enregistré
                {incidents.length > 1 ? 's' : ''}
              </p>
            </div>

            {openCount > 0 && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '6px 14px',
                  borderRadius: '20px',
                  background: 'rgba(239,68,68,0.1)',
                  border: '1px solid rgba(239,68,68,0.2)',
                }}
              >
                <div
                  style={{
                    width: '7px',
                    height: '7px',
                    borderRadius: '50%',
                    background: '#ef4444',
                    boxShadow: '0 0 6px #ef4444',
                  }}
                />

                <span
                  style={{
                    fontSize: '12px',
                    fontWeight: 600,
                    color: '#f87171',
                  }}
                >
                  {openCount} actif{openCount > 1 ? 's' : ''}
                </span>
              </div>
            )}
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '2fr 160px 130px 110px 100px 250px',
              padding: '12px 28px',
              borderBottom: '1px solid var(--border)',
              background: 'var(--bg-secondary)',
            }}
          >
            {['Incident', 'API impactée', 'Statut', 'Durée', 'Priorité', 'Actions'].map(
              (header) => (
                <span
                  key={header}
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    color: 'var(--text-subtle)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                  }}
                >
                  {header}
                </span>
              ),
            )}
          </div>

          {loading ? (
            <div style={{ padding: '24px' }}>
              {[...Array(5)].map((_, index) => (
                <div
                  key={index}
                  className="skeleton"
                  style={{
                    height: '58px',
                    borderRadius: '10px',
                    marginBottom: '10px',
                  }}
                />
              ))}
            </div>
          ) : incidents.length === 0 ? (
            <div
              style={{
                padding: '48px',
                textAlign: 'center',
              }}
            >
              <CheckCircle2 size={34} color="#34d399" style={{ marginBottom: '12px' }} />

              <p
                style={{
                  margin: 0,
                  fontSize: '14px',
                  color: 'var(--text-muted)',
                }}
              >
                Aucun incident enregistré
              </p>
            </div>
          ) : (
            incidents.map((incident) => (
              <div
                key={incident.id}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '2fr 160px 130px 110px 100px 250px',
                  padding: '16px 28px',
                  borderBottom: '1px solid var(--border)',
                  alignItems: 'center',
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <p
                    style={{
                      margin: 0,
                      fontSize: '13px',
                      fontWeight: 700,
                      color: 'var(--text-primary)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {incident.title}
                  </p>

                  <p
                    style={{
                      margin: '4px 0 0',
                      fontSize: '11px',
                      color: 'var(--text-subtle)',
                    }}
                  >
                    Début : {formatDate(incident.start_time)}
                  </p>
                </div>

                <span
                  style={{
                    fontSize: '12px',
                    color: 'var(--text-muted)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {getServiceName(incident.api_service_id)}
                </span>

                <div>
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '5px 10px',
                      borderRadius: '999px',
                      background:
                        incident.status === 'OPEN'
                          ? 'rgba(239,68,68,0.12)'
                          : 'rgba(16,185,129,0.12)',
                      color: incident.status === 'OPEN' ? '#f87171' : '#34d399',
                      fontSize: '11px',
                      fontWeight: 700,
                    }}
                  >
                    {incident.status === 'OPEN' ? (
                      <AlertTriangle size={10} />
                    ) : (
                      <CheckCircle2 size={10} />
                    )}
                    {STATUT_FR[incident.status] || incident.status}
                  </span>
                </div>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <Clock3 size={12} color="var(--text-subtle)" />

                  <span
                    style={{
                      fontSize: '12px',
                      fontFamily: 'monospace',
                      fontWeight: 500,
                      color: incident.status === 'OPEN' ? '#fbbf24' : 'var(--text-muted)',
                    }}
                  >
                    {formatDuration(incident)}
                  </span>
                </div>

                <div>
                  <span
                    style={{
                      display: 'inline-block',
                      padding: '3px 10px',
                      borderRadius: '4px',
                      fontSize: '10px',
                      fontWeight: 700,
                      letterSpacing: '0.05em',
                      background:
                        incident.status === 'OPEN'
                          ? 'rgba(239,68,68,0.15)'
                          : 'rgba(107,114,128,0.15)',
                      color: incident.status === 'OPEN' ? '#f87171' : 'var(--text-muted)',
                    }}
                  >
                    {PRIORITE_FR[incident.status] || incident.status}
                  </span>
                </div>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    flexWrap: 'wrap',
                  }}
                >
                  <button
                    onClick={() => openAiAnalysis(incident)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '7px 12px',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      background: 'rgba(217,70,239,0.10)',
                      border: '1px solid rgba(217,70,239,0.25)',
                      color: '#d946ef',
                      fontSize: '12px',
                      fontWeight: 700,
                      fontFamily: 'Inter, sans-serif',
                    }}
                  >
                    <BrainCircuit size={13} />
                    AI Root Cause
                  </button>

                  {incident.status === 'OPEN' ? (
                    <button
                      onClick={() => openResolve(incident)}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '7px 12px',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        background: 'rgba(16,185,129,0.1)',
                        border: '1px solid rgba(16,185,129,0.25)',
                        color: '#34d399',
                        fontSize: '12px',
                        fontWeight: 700,
                        fontFamily: 'Inter, sans-serif',
                      }}
                    >
                      Résoudre <ChevronRight size={12} />
                    </button>
                  ) : (
                    <span
                      style={{
                        fontSize: '11px',
                        color: 'var(--text-subtle)',
                        fontStyle: 'italic',
                      }}
                    >
                      Clôturé
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Déclarer un incident">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <Input
            label="Titre de l'incident"
            value={createForm.title}
            onChange={(event) =>
              setCreateForm((form) => ({
                ...form,
                title: event.target.value,
              }))
            }
            placeholder="Ex : API Paiement indisponible"
          />

          <Select
            label="API impactée"
            value={createForm.api_service_id}
            onChange={(event) =>
              setCreateForm((form) => ({
                ...form,
                api_service_id: event.target.value,
              }))
            }
            options={services.map((service) => ({
              value: service.id,
              label: service.name,
            }))}
          />

          <div style={{ display: 'flex', gap: '12px', paddingTop: '8px' }}>
            <Button
              variant="secondary"
              onClick={() => setShowCreate(false)}
              style={{ flex: 1 }}
            >
              Annuler
            </Button>

            <Button
              onClick={handleCreate}
              loading={actionLoading}
              disabled={!createForm.title || !createForm.api_service_id}
              style={{ flex: 1 }}
            >
              Déclarer l'incident
            </Button>
          </div>
        </div>
      </Modal>

      <Modal open={showResolve} onClose={() => setShowResolve(false)} title="Résoudre l'incident">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <p
            style={{
              margin: 0,
              fontSize: '13px',
              color: 'var(--text-muted)',
              lineHeight: '1.6',
            }}
          >
            Décrivez la cause racine et la solution appliquée pour clôturer définitivement
            l'incident.
          </p>

          {selectedIncident && (
            <div
              style={{
                padding: '12px',
                borderRadius: '10px',
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border)',
              }}
            >
              <p
                style={{
                  margin: 0,
                  fontSize: '13px',
                  fontWeight: 700,
                  color: 'var(--text-primary)',
                }}
              >
                {selectedIncident.title}
              </p>

              <p
                style={{
                  margin: '4px 0 0',
                  fontSize: '12px',
                  color: 'var(--text-subtle)',
                }}
              >
                API : {getServiceName(selectedIncident.api_service_id)}
              </p>
            </div>
          )}

          <textarea
            value={resolution}
            onChange={(event) => setResolution(event.target.value)}
            placeholder="Ex : correction du timeout sur le service d’authentification..."
            style={{
              minHeight: '120px',
              resize: 'vertical',
              padding: '12px',
              borderRadius: '10px',
              border: '1px solid var(--border)',
              background: 'var(--input-bg)',
              color: 'var(--text-primary)',
              fontFamily: 'Inter, sans-serif',
              outline: 'none',
            }}
          />

          <div style={{ display: 'flex', gap: '12px', paddingTop: '8px' }}>
            <Button
              variant="secondary"
              onClick={() => setShowResolve(false)}
              style={{ flex: 1 }}
            >
              Annuler
            </Button>

            <Button
              onClick={handleResolve}
              loading={actionLoading}
              disabled={!resolution.trim()}
              style={{ flex: 1 }}
            >
              Résoudre
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        open={showAiModal}
        onClose={() => setShowAiModal(false)}
        title="Analyse IA de l’incident"
        size="lg"
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            maxHeight: '78vh',
          }}
        >
          {selectedIncident && (
            <div
              style={{
                padding: '16px',
                borderRadius: '16px',
                background: 'linear-gradient(180deg, rgba(217,70,239,0.10), rgba(15,23,42,0.02))',
                border: '1px solid rgba(217,70,239,0.22)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  gap: '14px',
                }}
              >
                <div style={{ display: 'flex', gap: '12px', minWidth: 0 }}>
                  <div
                    style={{
                      width: 42,
                      height: 42,
                      borderRadius: 12,
                      background: 'rgba(217,70,239,0.16)',
                      border: '1px solid rgba(217,70,239,0.28)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <BrainCircuit size={20} color="#d946ef" />
                  </div>

                  <div style={{ minWidth: 0 }}>
                    <p
                      style={{
                        margin: 0,
                        fontSize: '11px',
                        fontWeight: 800,
                        letterSpacing: '0.1em',
                        textTransform: 'uppercase',
                        color: '#d946ef',
                      }}
                    >
                      Root Cause Analysis
                    </p>

                    <h3
                      style={{
                        margin: '5px 0 0',
                        fontSize: '16px',
                        fontWeight: 800,
                        color: 'var(--text-primary)',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {selectedIncident.title}
                    </h3>

                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        flexWrap: 'wrap',
                        marginTop: '10px',
                      }}
                    >
                      <span
                        style={{
                          padding: '5px 10px',
                          borderRadius: 999,
                          background: 'var(--bg-secondary)',
                          border: '1px solid var(--border)',
                          color: 'var(--text-muted)',
                          fontSize: '12px',
                          fontWeight: 700,
                        }}
                      >
                        API : {getServiceName(selectedIncident.api_service_id)}
                      </span>

                      <span
                        style={{
                          padding: '5px 10px',
                          borderRadius: 999,
                          background:
                            selectedIncident.status === 'OPEN'
                              ? 'rgba(239,68,68,0.12)'
                              : 'rgba(16,185,129,0.12)',
                          border:
                            selectedIncident.status === 'OPEN'
                              ? '1px solid rgba(239,68,68,0.25)'
                              : '1px solid rgba(16,185,129,0.25)',
                          color: selectedIncident.status === 'OPEN' ? '#f87171' : '#34d399',
                          fontSize: '12px',
                          fontWeight: 800,
                        }}
                      >
                        {STATUT_FR[selectedIncident.status] || selectedIncident.status}
                      </span>

                      <span
                        style={{
                          padding: '5px 10px',
                          borderRadius: 999,
                          background: 'var(--bg-secondary)',
                          border: '1px solid var(--border)',
                          color: 'var(--text-muted)',
                          fontSize: '12px',
                          fontWeight: 700,
                        }}
                      >
                        Durée : {formatDuration(selectedIncident)}
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => setShowAiModal(false)}
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 10,
                    border: '1px solid var(--border)',
                    background: 'var(--bg-card)',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <X size={16} />
                </button>
              </div>
            </div>
          )}

          {aiLoading ? (
            <div
              style={{
                padding: '34px',
                textAlign: 'center',
                borderRadius: '16px',
                border: '1px solid rgba(217,70,239,0.20)',
                background: 'var(--bg-card)',
              }}
            >
              <div
                style={{
                  width: 54,
                  height: 54,
                  borderRadius: 18,
                  background: 'rgba(217,70,239,0.12)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 14px',
                }}
              >
                <BrainCircuit size={28} color="#d946ef" />
              </div>

              <p
                style={{
                  margin: 0,
                  fontSize: '15px',
                  color: 'var(--text-primary)',
                  fontWeight: 800,
                }}
              >
                Analyse IA en cours...
              </p>

              <p
                style={{
                  margin: '8px auto 0',
                  maxWidth: 460,
                  fontSize: '12px',
                  color: 'var(--text-subtle)',
                  lineHeight: 1.7,
                }}
              >
                Traceon analyse les métriques, alertes et événements liés pour proposer une cause racine probable.
              </p>

              <div
                style={{
                  marginTop: '20px',
                  display: 'grid',
                  gap: '10px',
                }}
              >
                {[...Array(4)].map((_, index) => (
                  <div
                    key={index}
                    className="skeleton"
                    style={{ height: 46, borderRadius: 12 }}
                  />
                ))}
              </div>
            </div>
          ) : aiError ? (
            <div
              style={{
                padding: '16px',
                borderRadius: '14px',
                border: '1px solid rgba(239,68,68,0.25)',
                background: 'rgba(239,68,68,0.08)',
                color: '#fca5a5',
                fontSize: '13px',
                lineHeight: 1.7,
              }}
            >
              {aiError}
            </div>
          ) : (
            <>
              <div
                style={{
                  flex: 1,
                  minHeight: 0,
                  maxHeight: '52vh',
                  overflowY: 'auto',
                  paddingRight: '4px',
                  display: 'grid',
                  gap: '12px',
                }}
              >
                {aiSections.length === 0 ? (
                  <div
                    style={{
                      padding: '18px',
                      borderRadius: '14px',
                      background: 'var(--bg-card)',
                      border: '1px solid var(--border)',
                      color: 'var(--text-muted)',
                      fontSize: '13px',
                    }}
                  >
                    Aucune analyse disponible.
                  </div>
                ) : (
                  aiSections.map((section, index) => {
                    const tone = getSectionTone(section.title)

                    return (
                      <div
                        key={`${section.title}-${index}`}
                        style={{
                          padding: '16px',
                          borderRadius: '14px',
                          background: 'var(--bg-card)',
                          border: '1px solid var(--border)',
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            marginBottom: '12px',
                          }}
                        >
                          <div
                            style={{
                              width: 28,
                              height: 28,
                              borderRadius: 9,
                              background: tone.bg,
                              border: `1px solid ${tone.border}`,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: tone.color,
                              fontSize: '12px',
                              fontWeight: 900,
                              flexShrink: 0,
                            }}
                          >
                            {index + 1}
                          </div>

                          <h4
                            style={{
                              margin: 0,
                              fontSize: '13px',
                              fontWeight: 800,
                              color: 'var(--text-primary)',
                            }}
                          >
                            {section.title}
                          </h4>
                        </div>

                        <div style={{ display: 'grid', gap: '8px' }}>
                          {section.content.length === 0 ? (
                            <p
                              style={{
                                margin: 0,
                                color: 'var(--text-muted)',
                                fontSize: '13px',
                              }}
                            >
                              Aucun détail fourni.
                            </p>
                          ) : (
                            section.content.map((item, itemIndex) => (
                              <div
                                key={`${section.title}-${itemIndex}`}
                                style={{
                                  display: 'flex',
                                  gap: '9px',
                                  alignItems: 'flex-start',
                                  padding: '9px 10px',
                                  borderRadius: '10px',
                                  background: 'var(--bg-secondary)',
                                  border: '1px solid var(--border)',
                                }}
                              >
                                <span
                                  style={{
                                    width: 6,
                                    height: 6,
                                    borderRadius: '50%',
                                    background: tone.color,
                                    marginTop: 7,
                                    flexShrink: 0,
                                  }}
                                />

                                <p
                                  style={{
                                    margin: 0,
                                    color: 'var(--text-muted)',
                                    fontSize: '13px',
                                    lineHeight: 1.65,
                                  }}
                                >
                                  {item}
                                </p>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    )
                  })
                )}
              </div>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: '10px',
                  paddingTop: '12px',
                  borderTop: '1px solid var(--border)',
                }}
              >
                <span
                  style={{
                    fontSize: '11px',
                    color: 'var(--text-subtle)',
                  }}
                >
                  Analyse générée par IA locale. À valider avec les logs et les métriques réelles.
                </span>

                <div style={{ display: 'flex', gap: '10px', flexShrink: 0 }}>
                  <Button
                    variant="secondary"
                    icon={Copy}
                    onClick={handleCopyAiAnalysis}
                    disabled={!aiAnalysis}
                  >
                    Copier
                  </Button>

                  <Button onClick={() => setShowAiModal(false)}>Fermer</Button>
                </div>
              </div>
            </>
          )}
        </div>
      </Modal>
    </Layout>
  )
}