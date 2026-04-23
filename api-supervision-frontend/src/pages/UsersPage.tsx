import React, { useEffect, useState } from 'react'
import { Plus, Trash2, Shield, User } from 'lucide-react'
import { Layout }  from '../components/layout/Layout'
import { Header }  from '../components/layout/Header'
import { useAuth } from '../hooks/useAuth'
import api         from '../services/api'

interface UserData {
  id:         string
  name:       string
  email:      string
  role:       'ADMIN' | 'DEVOPS'
  is_active:  boolean
  created_at: string
}

const ROLE_FR: Record<string, string> = {
  ADMIN:  'Administrateur',
  DEVOPS: 'DevOps',
}

export const UsersPage: React.FC = () => {
  const { isAdmin } = useAuth()
  const [users,         setUsers]         = useState<UserData[]>([])
  const [loading,       setLoading]       = useState(true)
  const [showModal,     setShowModal]     = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const [form, setForm] = useState({
    name: '', email: '', password: '', role: 'DEVOPS' as 'ADMIN' | 'DEVOPS',
  })

  useEffect(() => { if (isAdmin) loadUsers() }, [isAdmin])

  const loadUsers = async () => {
    setLoading(true)
    try {
      const res = await api.get('/users')
      setUsers(res.data)
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async () => {
    setActionLoading(true)
    try {
      await api.post('/auth/register', form)
      setShowModal(false)
      setForm({ name: '', email: '', password: '', role: 'DEVOPS' })
      await loadUsers()
    } finally {
      setActionLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer cet utilisateur ?')) return
    await api.delete(`/users/${id}`)
    await loadUsers()
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '10px 14px',
    background: 'var(--input-bg)',
    border: '1px solid var(--border)',
    borderRadius: '8px',
    color: 'var(--text-primary)',
    fontSize: '13px', outline: 'none',
    fontFamily: 'Sora, sans-serif',
    boxSizing: 'border-box',
  }

  const labelStyle: React.CSSProperties = {
    display: 'block', fontSize: '12px', fontWeight: 600,
    color: 'var(--text-muted)', marginBottom: '8px',
    textTransform: 'uppercase', letterSpacing: '0.05em',
  }

  if (!isAdmin) {
    return (
      <Layout>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          height: '60vh', flexDirection: 'column', gap: '16px',
        }}>
          <div style={{
            width: '64px', height: '64px', borderRadius: '14px',
            background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Shield size={28} color="#ef4444" />
          </div>
          <p style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)' }}>
            Accès refusé
          </p>
          <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-subtle)' }}>
            Cette page est réservée aux administrateurs.
          </p>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <Header
        title="Utilisateurs"
        subtitle="Gestion des comptes et des rôles"
        actions={
          <button
            onClick={() => setShowModal(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              padding: '9px 18px',
              background: '#8b5cf6',
              border: '1px solid rgba(217,70,239,0.3)',
              borderRadius: '8px', color: 'white',
              fontSize: '13px', fontWeight: 600,
              cursor: 'pointer', fontFamily: 'Sora, sans-serif',
            }}
          >
            <Plus size={15} />
            Nouvel utilisateur
          </button>
        }
      />

      <div style={{ padding: '28px 32px' }}>
        <div style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: '12px', overflow: 'hidden',
        }}>
          {/* En-têtes */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 200px 150px 100px 80px',
            padding: '12px 24px',
            borderBottom: '1px solid var(--border)',
            background: 'var(--bg-secondary)',
          }}>
            {['Utilisateur', 'Email', 'Rôle', 'Statut', ''].map(h => (
              <span key={h} style={{
                fontSize: '11px', fontWeight: 700,
                color: 'var(--text-subtle)',
                textTransform: 'uppercase', letterSpacing: '0.08em',
              }}>
                {h}
              </span>
            ))}
          </div>

          {loading ? (
            <div style={{ padding: '20px 24px' }}>
              {[...Array(3)].map((_, i) => (
                <div key={i} className="skeleton"
                  style={{ height: '56px', marginBottom: '8px', borderRadius: '8px' }} />
              ))}
            </div>
          ) : (
            users.map((u, index) => (
              <div
                key={u.id}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 200px 150px 100px 80px',
                  padding: '16px 24px',
                  borderBottom: index < users.length - 1 ? '1px solid var(--border)' : 'none',
                  alignItems: 'center', transition: 'background 0.15s',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--hover-bg)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                {/* Nom */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    width: '36px', height: '36px', borderRadius: '8px',
                    background: u.role === 'ADMIN' ? 'rgba(217,70,239,0.1)' : 'rgba(16,185,129,0.1)',
                    border: `1px solid ${u.role === 'ADMIN' ? 'rgba(217,70,239,0.2)' : 'rgba(16,185,129,0.2)'}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>
                    <User size={16} color={u.role === 'ADMIN' ? '#e879f9' : '#10b981'} />
                  </div>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                    {u.name}
                  </span>
                </div>

                {/* Email */}
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  {u.email}
                </span>

                {/* Rôle en français */}
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: '6px',
                  padding: '4px 10px', borderRadius: '20px',
                  width: 'fit-content', fontSize: '11px', fontWeight: 700,
                  background: u.role === 'ADMIN' ? 'rgba(217,70,239,0.12)' : 'rgba(16,185,129,0.12)',
                  border: `1px solid ${u.role === 'ADMIN' ? 'rgba(217,70,239,0.25)' : 'rgba(16,185,129,0.25)'}`,
                  color: u.role === 'ADMIN' ? '#c084fc' : '#6ee7b7',
                }}>
                  {ROLE_FR[u.role] || u.role}
                </span>

                {/* Statut */}
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: '6px',
                  padding: '4px 10px', borderRadius: '20px',
                  width: 'fit-content', fontSize: '11px', fontWeight: 600,
                  background: u.is_active ? 'rgba(16,185,129,0.08)' : 'rgba(100,116,139,0.08)',
                  color: u.is_active ? '#6ee7b7' : 'var(--text-muted)',
                }}>
                  <div style={{
                    width: '5px', height: '5px', borderRadius: '50%',
                    background: u.is_active ? '#10b981' : 'var(--text-muted)',
                  }} />
                  {u.is_active ? 'Actif' : 'Inactif'}
                </span>

                {/* Supprimer */}
                <button
                  onClick={() => handleDelete(u.id)}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: 'var(--text-subtle)', padding: '6px', borderRadius: '6px',
                    transition: 'color 0.15s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.color = '#f87171')}
                  onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-subtle)')}
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Modale création */}
      {showModal && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div onClick={() => setShowModal(false)} style={{
            position: 'absolute', inset: 0,
            background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
          }} />
          <div style={{
            position: 'relative', width: '440px',
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: '12px', overflow: 'hidden',
          }}>
            <div style={{
              padding: '20px 24px',
              borderBottom: '1px solid var(--border)',
              background: 'var(--bg-secondary)',
            }}>
              <span style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>
                Créer un utilisateur
              </span>
            </div>
            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {[
                { label: 'Nom complet',  key: 'name',     type: 'text',     placeholder: 'Ex : Ahmed Ben Ali' },
                { label: 'Adresse email', key: 'email',   type: 'email',    placeholder: 'devops@company.com' },
                { label: 'Mot de passe', key: 'password', type: 'password', placeholder: '••••••••'           },
              ].map(field => (
                <div key={field.key}>
                  <label style={labelStyle}>{field.label}</label>
                  <input
                    type={field.type}
                    value={(form as any)[field.key]}
                    onChange={e => setForm(f => ({ ...f, [field.key]: e.target.value }))}
                    placeholder={field.placeholder}
                    style={inputStyle}
                    onFocus={e => (e.target.style.borderColor = '#d946ef')}
                    onBlur={e => (e.target.style.borderColor = 'var(--border)')}
                  />
                </div>
              ))}
              <div>
                <label style={labelStyle}>Rôle</label>
                <select
                  value={form.role}
                  onChange={e => setForm(f => ({ ...f, role: e.target.value as 'ADMIN' | 'DEVOPS' }))}
                  style={inputStyle}
                >
                  <option value="DEVOPS">DevOps — Consultation + traitement alertes</option>
                  <option value="ADMIN">Administrateur — Accès complet</option>
                </select>
              </div>
              <div style={{ display: 'flex', gap: '10px', paddingTop: '8px' }}>
                <button
                  onClick={() => setShowModal(false)}
                  style={{
                    flex: 1, padding: '10px',
                    background: 'transparent',
                    border: '1px solid var(--border)',
                    borderRadius: '8px', color: 'var(--text-muted)',
                    fontSize: '13px', fontWeight: 600,
                    cursor: 'pointer', fontFamily: 'Sora, sans-serif',
                  }}
                >
                  Annuler
                </button>
                <button
                  onClick={handleCreate}
                  disabled={!form.name || !form.email || !form.password || actionLoading}
                  style={{
                    flex: 1, padding: '10px',
                    background: '#8b5cf6',
                    border: 'none', borderRadius: '8px',
                    color: 'white', fontSize: '13px', fontWeight: 600,
                    cursor: 'pointer', fontFamily: 'Sora, sans-serif',
                    opacity: (!form.name || !form.email || !form.password) ? 0.5 : 1,
                  }}
                >
                  {actionLoading ? 'Création...' : 'Créer le compte'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}