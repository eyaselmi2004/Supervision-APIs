import React, { useEffect, useState } from 'react'
import { Plus, Bell, Mail, Globe, Trash2, ToggleLeft, ToggleRight } from 'lucide-react'
import { Layout }        from '../components/layout/Layout'
import { Header }        from '../components/layout/Header'
import { Button }        from '../components/ui/Button'
import { Modal }         from '../components/ui/Modal'
import { Input, Select } from '../components/ui/Input'
import { notificationsService } from '../services/incidents.service'
import { useAuth }              from '../hooks/useAuth'

export const NotificationsPage: React.FC = () => {
  const { isAdmin } = useAuth()
  const [channels,      setChannels]      = useState<any[]>([])
  const [loading,       setLoading]       = useState(true)
  const [showModal,     setShowModal]     = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const [form, setForm] = useState({
    name: '', type: 'EMAIL', target: '', is_enabled: true,
  })

  useEffect(() => { loadChannels() }, [])

  const loadChannels = async () => {
    setLoading(true)
    try {
      const data = await notificationsService.getAll()
      setChannels(data)
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async () => {
    setActionLoading(true)
    try {
      await notificationsService.create({
        name: form.name, type: form.type as 'EMAIL' | 'WEBHOOK',
        target: form.target, is_enabled: true,
      })
      setShowModal(false)
      setForm({ name: '', type: 'EMAIL', target: '', is_enabled: true })
      await loadChannels()
    } finally {
      setActionLoading(false)
    }
  }

  const handleToggle = async (channel: any) => {
    await notificationsService.update(channel.id, { is_enabled: !channel.is_enabled })
    await loadChannels()
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer ce canal ?')) return
    await notificationsService.delete(id)
    await loadChannels()
  }

  return (
    <Layout>
      <Header
        title="Notifications"
        subtitle="Canaux d'envoi des alertes"
        actions={
          isAdmin
            ? <Button icon={Plus} onClick={() => setShowModal(true)}>Nouveau canal</Button>
            : undefined
        }
      />

      <div style={{ padding: '24px 32px' }}>

        {loading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
            {[...Array(3)].map((_, i) => (
              <div key={i} className="skeleton" style={{ height: '120px', borderRadius: '12px' }} />
            ))}
          </div>

        ) : channels.length === 0 ? (
          <div style={{
            background: 'var(--bg-card)', border: '1px solid var(--border)',
            borderRadius: '12px', padding: '56px', textAlign: 'center',
          }}>
            <Bell size={32} color="var(--text-subtle)" style={{ marginBottom: '12px' }} />
            <p style={{ margin: '0 0 16px', fontSize: '13px', color: 'var(--text-subtle)' }}>
              Aucun canal configuré
            </p>
            {isAdmin && (
              <Button icon={Plus} size="sm" onClick={() => setShowModal(true)}>
                Ajouter un canal
              </Button>
            )}
          </div>

        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: '16px',
          }}>
            {channels.map(channel => (
              <div key={channel.id} style={{
                background: 'var(--bg-card)',
                border: `1px solid ${channel.is_enabled ? 'rgba(217,70,239,0.2)' : 'var(--border)'}`,
                borderRadius: '12px', padding: '20px',
                opacity: channel.is_enabled ? 1 : 0.6,
                transition: 'all 0.2s',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{
                      padding: '8px', borderRadius: '8px',
                      background: channel.type === 'EMAIL' ? 'rgba(217,70,239,0.1)' : 'rgba(139,92,246,0.1)',
                    }}>
                      {channel.type === 'EMAIL'
                        ? <Mail size={16} color="#e879f9" />
                        : <Globe size={16} color="#a78bfa" />}
                    </div>
                    <div>
                      <p style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                        {channel.name}
                      </p>
                      <span style={{
                        fontSize: '10px', fontWeight: 600, padding: '2px 6px', borderRadius: '4px',
                        background: channel.type === 'EMAIL' ? 'rgba(217,70,239,0.15)' : 'rgba(139,92,246,0.15)',
                        color: channel.type === 'EMAIL' ? '#e879f9' : '#c084fc',
                      }}>
                        {channel.type === 'EMAIL' ? 'Courriel' : 'Webhook'}
                      </span>
                    </div>
                  </div>

                  {/* Bouton supprimer — Admin uniquement */}
                  {isAdmin && (
                    <button
                      onClick={() => handleDelete(channel.id)}
                      style={{
                        background: 'none', border: 'none', cursor: 'pointer',
                        color: 'var(--text-subtle)', padding: '4px', borderRadius: '6px',
                        transition: 'color 0.15s',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.color = '#f87171')}
                      onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-subtle)')}
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>

                <p style={{
                  margin: '0 0 12px', fontSize: '12px', color: 'var(--text-subtle)',
                  fontFamily: 'monospace', overflow: 'hidden',
                  textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {channel.target}
                </p>

                {/* Toggle actif/inactif — Admin uniquement */}
                {isAdmin ? (
                  <button
                    onClick={() => handleToggle(channel)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '6px',
                      background: 'none', border: 'none', cursor: 'pointer',
                      fontSize: '12px', fontWeight: 500, padding: 0,
                      color: channel.is_enabled ? '#34d399' : 'var(--text-subtle)',
                      fontFamily: 'Sora, sans-serif',
                    }}
                  >
                    {channel.is_enabled
                      ? <ToggleRight size={18} color="#34d399" />
                      : <ToggleLeft  size={18} color="var(--text-subtle)" />}
                    {channel.is_enabled ? 'Actif' : 'Inactif'}
                  </button>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div style={{
                      width: '8px', height: '8px', borderRadius: '50%',
                      background: channel.is_enabled ? '#34d399' : 'var(--text-subtle)',
                    }} />
                    <span style={{ fontSize: '12px', color: channel.is_enabled ? '#34d399' : 'var(--text-subtle)' }}>
                      {channel.is_enabled ? 'Actif' : 'Inactif'}
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modale création — Admin uniquement */}
      {isAdmin && (
        <Modal open={showModal} onClose={() => setShowModal(false)} title="Nouveau canal">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <Input
              label="Nom du canal"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="Ex : Email DevOps"
            />
            <Select
              label="Type"
              value={form.type}
              onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
              options={[
                { value: 'EMAIL',   label: 'Courriel (SMTP)'       },
                { value: 'WEBHOOK', label: 'Webhook (Slack, Teams)' },
              ]}
            />
            <Input
              label={form.type === 'EMAIL' ? 'Adresse courriel' : 'URL du webhook'}
              value={form.target}
              onChange={e => setForm(f => ({ ...f, target: e.target.value }))}
              placeholder={form.type === 'EMAIL' ? 'devops@entreprise.com' : 'https://hooks.slack.com/...'}
            />
            <div style={{ display: 'flex', gap: '12px', paddingTop: '8px' }}>
              <Button variant="secondary" onClick={() => setShowModal(false)} style={{ flex: 1 }}>
                Annuler
              </Button>
              <Button
                onClick={handleCreate}
                loading={actionLoading}
                disabled={!form.name || !form.target}
                style={{ flex: 1 }}
              >
                Créer le canal
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </Layout>
  )
}