import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Users, AlertCircle } from 'lucide-react'
import api from '../services/api'

export const CreateTeamPage: React.FC = () => {
  const navigate = useNavigate()

  const [form, setForm] = useState({
    name: '',
    description: '',
  })

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await api.post('/teams/', {
        name: form.name,
        description: form.description,
})

    navigate(`/teams?created=${response.data.id}`)
    alert(`Team créée ! Code d'invitation : ${response.data.invite_code}`)
    } catch (err: any) {
      setError(err.response?.data?.detail ?? 'Erreur lors de la création de l’équipe')
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
      <div style={{
        height: 64,
        padding: '0 32px',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
      }}>
        <button
          onClick={() => navigate('/onboarding')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 7,
            background: 'none',
            border: '1px solid var(--border)',
            borderRadius: 8,
            padding: '7px 14px',
            cursor: 'pointer',
            color: 'var(--text-muted)',
          }}
        >
          <ArrowLeft size={14} /> Back
        </button>
      </div>

      <div style={{
        flex: 1,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
      }}>
        <div style={{ width: '100%', maxWidth: 520 }}>
          <div style={{ textAlign: 'center', marginBottom: 30 }}>
            <Users size={42} color="#E07FA0" />
            <h1 style={{
              fontSize: 28,
              fontWeight: 900,
              color: 'var(--text-primary)',
              margin: '16px 0 8px',
            }}>
              Create your team
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>
              Your team will contain projects, APIs, alerts and members.
            </p>
          </div>

          <form
            onSubmit={handleSubmit}
            style={{
              background: 'var(--background-card)',
              border: '1px solid var(--border)',
              borderRadius: 18,
              padding: 32,
              display: 'flex',
              flexDirection: 'column',
              gap: 18,
            }}
          >
            <div>
              <label style={labelStyle}>Team name</label>
              <input
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Example: Backend Team"
                required
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>Description</label>
              <textarea
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Short description"
                rows={4}
                style={{ ...inputStyle, resize: 'vertical' }}
              />
            </div>

            {error && (
              <div style={{ display: 'flex', gap: 8, color: '#dc2626', fontSize: 13 }}>
                <AlertCircle size={16} />
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                padding: '12px 16px',
                borderRadius: 10,
                border: 'none',
                background: '#E07FA0',
                color: '#fff',
                fontWeight: 850,
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.7 : 1,
              }}
            >
              {loading ? 'Creating team...' : 'Create team'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 11,
  fontWeight: 700,
  color: 'var(--text-muted)',
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  marginBottom: 8,
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '11px 14px',
  borderRadius: 8,
  fontSize: 14,
  background: 'var(--bg-secondary)',
  border: '1px solid var(--border)',
  color: 'var(--text-primary)',
  outline: 'none',
}