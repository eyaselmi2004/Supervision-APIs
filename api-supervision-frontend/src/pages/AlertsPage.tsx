import React, { useEffect, useState } from 'react'
import { Plus, Bell, Settings, Trash2, CheckCheck, CircleCheck, ChevronDown } from 'lucide-react'
import { Layout }        from '../components/layout/Layout'
import { Header }        from '../components/layout/Header'
import { Button }        from '../components/ui/Button'
import { Modal }         from '../components/ui/Modal'
import { Input, Select } from '../components/ui/Input'
import { AlertSeverityBadge, StatusTypeBadge } from '../components/ui/Badge'
import { StatusBadgeWithDot } from '../components/ui/StatusIndicator'
import { alertsService }      from '../services/alerts.service'
import { apiServicesService } from '../services/apiServices.service'
import { useAuth }            from '../hooks/useAuth'
import type { Alert, AlertRule, Endpoint } from '../types'

const TYPES_REGLES = [
  { value: 'LATENCY',    label: 'Latence (ms)'      },
  { value: 'ERROR_RATE', label: "Taux d'erreur (%)" },
  { value: 'DOWNTIME',   label: 'Indisponibilité'   },
]

const FILTRES_STATUT = [
  { value: '',             label: 'Tous les statuts' },
  { value: 'OPEN',         label: 'Ouvertes'         },
  { value: 'ACKNOWLEDGED', label: 'Prises en charge' },
  { value: 'RESOLVED',     label: 'Résolues'         },
]

const TYPE_REGLE_FR: Record<string, string> = {
  LATENCY: 'Latence', ERROR_RATE: "Taux d'erreur", DOWNTIME: 'Indisponibilité',
}

// ──── Composant Avatar ────
const UserAvatar: React.FC<{ name?: string; size?: number }> = ({ 
  name = '?', 
  size = 32 
}) => {
  const initials = name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  const colors = [
    { bg: '#d946ef', text: '#fff' },      // Pink
    { bg: '#c026d3', text: '#fff' },      // Purple
    { bg: '#a21caf', text: '#fff' },      // Purple Accent
    { bg: '#ec4899', text: '#fff' },      // Pink Accent
    { bg: '#10b981', text: '#fff' },      // Green
    { bg: '#f59e0b', text: '#fff' },      // Amber
  ]

  const colorIndex = name.charCodeAt(0) % colors.length
  const selectedColor = colors[colorIndex]

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: selectedColor.bg,
        color: selectedColor.text,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: size === 32 ? '13px' : '11px',
        fontWeight: 600,
        flexShrink: 0,
      }}
      title={name}
    >
      {initials}
    </div>
  )
}

// ──── Composant Dropdown Assignee ────
const AssigneeDropdown: React.FC<{
  alertId: string
  assignedTo?: string
  users: Array<{ id: string; name: string }>
  onAssign: (alertId: string, userId?: string) => void
}> = ({ alertId, assignedTo, users, onAssign }) => {
  const [isOpen, setIsOpen] = useState(false)
  const assignedUser = users.find(u => u.id === assignedTo)

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '4px 8px',
          background: 'transparent',
          border: '1px solid var(--border)',
          borderRadius: '6px',
          cursor: 'pointer',
          transition: 'all 0.15s',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = 'var(--text-muted)'
          e.currentTarget.style.background = 'rgba(255,255,255,0.02)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = 'var(--border)'
          e.currentTarget.style.background = 'transparent'
        }}
      >
        {assignedUser ? (
          <>
            <UserAvatar name={assignedUser.name} size={24} />
            <span style={{ fontSize: '11px', color: 'var(--text-primary)' }}>{assignedUser.name.split(' ')[0]}</span>
          </>
        ) : (
          <>
            <div
              style={{
                width: 24,
                height: 24,
                borderRadius: '50%',
                background: 'rgba(148,163,184,0.1)',
                border: '1px dashed var(--border)',
              }}
            />
            <span style={{ fontSize: '11px', color: 'var(--text-subtle)' }}>—</span>
          </>
        )}
        <ChevronDown size={14} style={{ color: 'var(--text-subtle)' }} />
      </button>

      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            marginTop: '4px',
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: '8px',
            minWidth: '180px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            zIndex: 1000,
          }}
        >
          {/* Option : Non assigné */}
          <button
            onClick={() => {
              onAssign(alertId, undefined)
              setIsOpen(false)
            }}
            style={{
              width: '100%',
              padding: '8px 12px',
              background: !assignedTo ? 'rgba(255,255,255,0.05)' : 'transparent',
              border: 'none',
              borderBottom: '1px solid var(--border)',
              textAlign: 'left',
              cursor: 'pointer',
              fontSize: '12px',
              color: 'var(--text-subtle)',
              transition: 'background 0.15s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.05)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = !assignedTo ? 'rgba(255,255,255,0.05)' : 'transparent'
            }}
          >
            Non assigné
          </button>

          {/* Liste des utilisateurs */}
          {users.map(user => (
            <button
              key={user.id}
              onClick={() => {
                onAssign(alertId, user.id)
                setIsOpen(false)
              }}
              style={{
                width: '100%',
                padding: '8px 12px',
                background: assignedTo === user.id ? 'rgba(255,255,255,0.05)' : 'transparent',
                border: 'none',
                borderBottom: '1px solid var(--border)',
                textAlign: 'left',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '12px',
                color: 'var(--text-primary)',
                transition: 'background 0.15s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.05)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = assignedTo === user.id ? 'rgba(255,255,255,0.05)' : 'transparent'
              }}
            >
              <UserAvatar name={user.name} size={20} />
              {user.name}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ──── Composant Principal ────
export const AlertsPage: React.FC = () => {
  const { isAdmin, isDevOps, user } = useAuth()

  const [alerts,    setAlerts]    = useState<Alert[]>([])
  const [rules,     setRules]     = useState<AlertRule[]>([])
  const [endpoints, setEndpoints] = useState<Endpoint[]>([])
  const [users,     setUsers]     = useState<Array<{ id: string; name: string }>>([])
  const [tab,           setTab]           = useState<'alerts' | 'rules'>('alerts')
  const [statusFilter,  setStatusFilter]  = useState('')
  const [loading,       setLoading]       = useState(true)
  const [showRuleModal, setShowRuleModal] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const [ruleForm, setRuleForm] = useState({
    name: '', type: 'LATENCY', threshold: '',
    window_seconds: '60', endpoint_id: '', is_enabled: true,
  })

  useEffect(() => { loadAll(); loadEndpoints(); loadUsers() }, [])
  useEffect(() => { loadAlerts() }, [statusFilter])

  const loadAll = async () => {
    setLoading(true)
    try {
      const [a, r] = await Promise.all([
        alertsService.getAll(statusFilter || undefined),
        alertsService.getRules(),
      ])
      setAlerts(a)
      setRules(r)
    } finally { 
      setLoading(false) 
    }
  }

  const loadAlerts = async () => {
    const a = await alertsService.getAll(statusFilter || undefined)
    setAlerts(a)
  }

  const loadEndpoints = async () => {
    try {
      const svcs = await apiServicesService.getAll()
      const allEps: Endpoint[] = []
      for (const svc of svcs) {
        const eps = await apiServicesService.getEndpoints(svc.id)
        allEps.push(...eps)
      }
      setEndpoints(allEps)
      if (allEps.length > 0) setRuleForm(f => ({ ...f, endpoint_id: allEps[0].id }))
    } catch (e) { 
      console.error('Erreur chargement endpoints:', e) 
    }
  }

  const loadUsers = async () => {
    try {
      const response = await fetch('/api/v1/users')
      if (!response.ok) {
        throw new Error(`Erreur ${response.status}: ${response.statusText}`)
      }
      const data: Array<{
        id: string
        name: string
        email: string
        role: string
        is_active: boolean
        created_at: string
      }> = await response.json()
      
      setUsers(
        data
          .filter(u => u.is_active)
          .map(u => ({
            id: u.id,
            name: u.name || u.email,
          }))
      )
    } catch (e) {
      console.error('Erreur chargement utilisateurs:', e)
      setUsers([
        { id: '1', name: 'Nour ben ali' },
        { id: '2', name: 'DevOps User' },
        { id: '3', name: 'Admin User' },
      ])
    }
  }

  const handleAcknowledge = async (alertId: string) => {
    setActionLoading(alertId)
    try {
      await alertsService.acknowledge(alertId, user?.id || '')
      await loadAlerts()
    } finally { 
      setActionLoading(null) 
    }
  }

  const handleResolve = async (alertId: string) => {
    setActionLoading(alertId)
    try {
      await alertsService.resolve(alertId)
      await loadAlerts()
    } finally { 
      setActionLoading(null) 
    }
  }

  const handleAssign = async (alertId: string, userId?: string) => {
    setActionLoading(alertId)
    try {
      setAlerts(alerts.map(a => 
        a.id === alertId ? { ...a, assigned_to_id: userId } : a
      ))
    } finally { 
      setActionLoading(null) 
    }
  }

  const handleCreateRule = async () => {
    await alertsService.createRule({
      name: ruleForm.name, 
      type: ruleForm.type as any,
      threshold: parseFloat(ruleForm.threshold),
      window_seconds: parseInt(ruleForm.window_seconds),
      endpoint_id: ruleForm.endpoint_id, 
      is_enabled: true,
    })
    setShowRuleModal(false)
    setRuleForm({ 
      name: '', 
      type: 'LATENCY', 
      threshold: '', 
      window_seconds: '60', 
      endpoint_id: endpoints[0]?.id ?? '', 
      is_enabled: true 
    })
    const r = await alertsService.getRules()
    setRules(r)
  }

  const handleDeleteRule = async (id: string) => {
    if (!confirm('Supprimer cette règle de surveillance ?')) return
    await alertsService.deleteRule(id)
    const r = await alertsService.getRules()
    setRules(r)
  }

  const openCount = alerts.filter(a => a.status === 'OPEN').length

  return (
    <Layout>
      <Header
        title="Alertes"
        subtitle="Surveillance et détection des anomalies"
        actions={
          tab === 'rules' && isAdmin
            ? <Button icon={Plus} onClick={() => setShowRuleModal(true)}>Nouvelle règle</Button>
            : undefined
        }
      />

      <div style={{ padding: '24px 32px' }}>

        {/* ──── ONGLETS ──── */}
        <div style={{
          display: 'flex', gap: '4px', marginBottom: '24px',
          background: 'var(--bg-card)', border: '1px solid var(--border)',
          borderRadius: '10px', padding: '4px', width: 'fit-content',
        }}>
          {([
            { key: 'alerts' as const, label: `Alertes${openCount > 0 ? ` (${openCount})` : ''}`, icon: Bell },
            { key: 'rules'  as const, label: `Règles (${rules.length})`, icon: Settings },
          ]).map(({ key, label, icon: Icon }) => (
            <button key={key} onClick={() => setTab(key)} style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '8px 16px', borderRadius: '7px',
              border: 'none', cursor: 'pointer',
              fontSize: '13px', fontWeight: 500,
              fontFamily: 'Sora, sans-serif', transition: 'all 0.15s',
              background: tab === key ? 'var(--bg-secondary)' : 'transparent',
              color:      tab === key ? 'var(--text-primary)' : 'var(--text-muted)',
            }}>
              <Icon size={14} />
              {label}
            </button>
          ))}
        </div>

        {/* ══════ ONGLET ALERTES ══════ */}
        {tab === 'alerts' && (
          <>
            {/* Filtres */}
            <div style={{ marginBottom: '16px', display: 'flex', gap: '12px', alignItems: 'center' }}>
              <label style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-subtle)' }}>Filtrer par:</label>
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                style={{
                  padding: '8px 12px', background: 'var(--input-bg)',
                  border: '1px solid var(--border)', borderRadius: '8px',
                  color: 'var(--text-primary)', fontSize: '13px', outline: 'none',
                  fontFamily: 'Sora, sans-serif', cursor: 'pointer',
                }}
              >
                {FILTRES_STATUT.map(f => (
                  <option key={f.value} value={f.value}>{f.label}</option>
                ))}
              </select>
            </div>

            {/* Tableau des alertes */}
            <div style={{
              background: 'var(--bg-card)', border: '1px solid var(--border)',
              borderRadius: '12px', overflow: 'hidden',
            }}>
              <div style={{
                display: 'grid',
                gridTemplateColumns: '140px 1fr 140px 160px 120px 200px',
                padding: '12px 20px',
                borderBottom: '1px solid var(--border)',
                background: 'var(--bg-secondary)',
              }}>
                {['Sévérité', 'Message', 'Statut', 'Date', 'Assigné', 'Actions'].map(h => (
                  <span key={h} style={{
                    fontSize: '11px', fontWeight: 600, color: 'var(--text-subtle)',
                    textTransform: 'uppercase', letterSpacing: '0.05em',
                  }}>
                    {h}
                  </span>
                ))}
              </div>

              {loading ? (
                <div style={{ padding: '20px' }}>
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="skeleton" style={{ height: '52px', marginBottom: '8px', borderRadius: '6px' }} />
                  ))}
                </div>
              ) : alerts.length === 0 ? (
                <div style={{ padding: '56px', textAlign: 'center' }}>
                  <Bell size={32} color="var(--text-subtle)" style={{ marginBottom: '12px' }} />
                  <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-subtle)' }}>
                    {statusFilter ? 'Aucune alerte avec ce statut' : '✅ Aucune alerte — tout fonctionne correctement'}
                  </p>
                </div>
              ) : (
                alerts.map(alert => (
                  <div
                    key={alert.id}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '140px 1fr 140px 160px 120px 200px',
                      padding: '14px 20px',
                      borderBottom: '1px solid var(--border)',
                      alignItems: 'center',
                      background: alert.status === 'OPEN' && alert.severity === 'CRITICAL'
                        ? 'rgba(239,68,68,0.04)' : 'transparent',
                      transition: 'background 0.15s',
                      cursor: 'pointer',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(255,255,255,0.02)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = alert.status === 'OPEN' && alert.severity === 'CRITICAL'
                        ? 'rgba(239,68,68,0.04)' : 'transparent'
                    }}
                  >
                    {/* Sévérité */}
                    <div>
                      <AlertSeverityBadge severity={alert.severity} />
                    </div>

                    {/* Message */}
                    <p style={{
                      margin: 0, fontSize: '13px', color: 'var(--text-primary)',
                      overflow: 'hidden', textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap', paddingRight: '16px',
                    }}>
                      {alert.message}
                    </p>

                    {/* Statut */}
                    <div>
                      <StatusBadgeWithDot
                        status={
                          alert.status === 'OPEN' ? 'open' :
                          alert.status === 'ACKNOWLEDGED' ? 'in-progress' : 'resolved'
                        }
                        animated={alert.status === 'OPEN'}
                      />
                    </div>

                    {/* Date */}
                    <span style={{ fontSize: '12px', color: 'var(--text-subtle)' }}>
                      {new Date(alert.created_at).toLocaleString('fr-FR', {
                        day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
                      })}
                    </span>

                    {/* Assigné */}
                    <AssigneeDropdown
                      alertId={alert.id}
                      assignedTo={alert.assigned_to_id}
                      users={users}
                      onAssign={handleAssign}
                    />

                    {/* Actions */}
                    <div style={{ display: 'flex', gap: '8px' }}>
                      {alert.status === 'OPEN' && isDevOps && (
                        <Button size="sm" variant="secondary" icon={CheckCheck}
                          loading={actionLoading === alert.id}
                          onClick={() => handleAcknowledge(alert.id)}>
                          Prendre en charge
                        </Button>
                      )}
                      {alert.status === 'ACKNOWLEDGED' && isDevOps && (
                        <Button size="sm" variant="secondary" icon={CircleCheck}
                          loading={actionLoading === alert.id}
                          onClick={() => handleResolve(alert.id)}>
                          Résoudre
                        </Button>
                      )}
                      {alert.status === 'RESOLVED' && (
                        <span style={{ fontSize: '12px', color: '#10b981' }}>✓ Résolue</span>
                      )}
                      {isAdmin && alert.status === 'OPEN' && (
                        <span style={{ fontSize: '11px', color: 'var(--text-subtle)', fontStyle: 'italic' }}>
                          En attente DevOps
                        </span>
                      )}
                      {isAdmin && alert.status === 'ACKNOWLEDGED' && (
                        <span style={{ fontSize: '11px', color: '#fbbf24', fontStyle: 'italic' }}>
                          En traitement
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        )}

        {/* ══════ ONGLET RÈGLES ══════ */}
        {tab === 'rules' && (
          <div style={{
            background: 'var(--bg-card)', border: '1px solid var(--border)',
            borderRadius: '12px', overflow: 'hidden',
          }}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: `1fr 160px 120px 120px 90px${isAdmin ? ' 50px' : ''}`,
              padding: '12px 20px',
              borderBottom: '1px solid var(--border)',
              background: 'var(--bg-secondary)',
            }}>
              {['Nom de la règle', 'Type', 'Seuil', 'Fenêtre', 'Statut', ...(isAdmin ? [''] : [])].map(h => (
                <span key={h} style={{
                  fontSize: '11px', fontWeight: 600, color: 'var(--text-subtle)',
                  textTransform: 'uppercase', letterSpacing: '0.05em',
                }}>
                  {h}
                </span>
              ))}
            </div>

            {rules.length === 0 ? (
              <div style={{ padding: '56px', textAlign: 'center' }}>
                <Settings size={32} color="var(--text-subtle)" style={{ marginBottom: '12px' }} />
                <p style={{ margin: '0 0 16px', fontSize: '13px', color: 'var(--text-subtle)' }}>
                  Aucune règle de surveillance configurée
                </p>
                {isAdmin && (
                  <Button icon={Plus} size="sm" onClick={() => setShowRuleModal(true)}>
                    Créer une règle
                  </Button>
                )}
              </div>
            ) : (
              rules.map(rule => (
                <div key={rule.id} style={{
                  display: 'grid',
                  gridTemplateColumns: `1fr 160px 120px 120px 90px${isAdmin ? ' 50px' : ''}`,
                  padding: '14px 20px',
                  borderBottom: '1px solid var(--border)',
                  alignItems: 'center',
                  transition: 'background 0.15s',
                }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.02)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent'
                  }}
                >
                  <p style={{ margin: 0, fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)' }}>
                    {rule.name}
                  </p>
                  
                  <StatusTypeBadge type={rule.type} />

                  <span style={{ fontSize: '13px', fontWeight: 700, color: '#e879f9', fontFamily: 'monospace' }}>
                    {rule.threshold}{rule.type === 'LATENCY' ? ' ms' : ' %'}
                  </span>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    {rule.window_seconds >= 3600 ? `${rule.window_seconds / 3600}h`
                      : rule.window_seconds >= 60 ? `${rule.window_seconds / 60} min`
                      : `${rule.window_seconds} sec`}
                  </span>
                  <span style={{ fontSize: '11px', fontWeight: 600, color: rule.is_enabled ? '#34d399' : 'var(--text-subtle)' }}>
                    {rule.is_enabled ? '● Actif' : '○ Inactif'}
                  </span>
                  {isAdmin && (
                    <button onClick={() => handleDeleteRule(rule.id)} style={{
                      background: 'none', border: 'none', cursor: 'pointer',
                      color: 'var(--text-subtle)', padding: '4px', borderRadius: '6px',
                      display: 'flex', alignItems: 'center', transition: 'color 0.15s',
                    }}
                      onMouseEnter={e => (e.currentTarget.style.color = '#f87171')}
                      onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-subtle)')}
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* ══════ MODALE NOUVELLE RÈGLE ══════ */}
      {isAdmin && (
        <Modal open={showRuleModal} onClose={() => setShowRuleModal(false)} title="Nouvelle règle de surveillance" size="md">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <Input 
              label="Nom de la règle" 
              value={ruleForm.name} 
              onChange={e => setRuleForm(f => ({ ...f, name: e.target.value }))} 
              placeholder="Ex : Latence élevée API Paiement" 
            />
            <Select 
              label="Type de surveillance" 
              value={ruleForm.type} 
              onChange={e => setRuleForm(f => ({ ...f, type: e.target.value }))} 
              options={TYPES_REGLES} 
            />
            <Input 
              label={ruleForm.type === 'LATENCY' ? 'Seuil de latence (ms)' : "Seuil du taux d'erreur (%)"} 
              type="number" 
              value={ruleForm.threshold} 
              onChange={e => setRuleForm(f => ({ ...f, threshold: e.target.value }))} 
              placeholder={ruleForm.type === 'LATENCY' ? '500' : '5'} 
            />
            <Input 
              label="Fenêtre d'analyse (secondes)" 
              type="number" 
              value={ruleForm.window_seconds} 
              onChange={e => setRuleForm(f => ({ ...f, window_seconds: e.target.value }))} 
              placeholder="60" 
            />
            <Select 
              label="Endpoint à surveiller" 
              value={ruleForm.endpoint_id} 
              onChange={e => setRuleForm(f => ({ ...f, endpoint_id: e.target.value }))}
              options={endpoints.length === 0 ? [{ value: '', label: 'Aucun endpoint disponible' }] : endpoints.map(ep => ({ value: ep.id, label: `${ep.method} ${ep.path}` }))}
            />
            <div style={{ display: 'flex', gap: '12px', paddingTop: '8px' }}>
              <Button variant="secondary" onClick={() => setShowRuleModal(false)} style={{ flex: 1 }}>Annuler</Button>
              <Button onClick={handleCreateRule} disabled={!ruleForm.name || !ruleForm.threshold || !ruleForm.endpoint_id} style={{ flex: 1 }}>Créer la règle</Button>
            </div>
          </div>
        </Modal>
      )}
    </Layout>
  )
}