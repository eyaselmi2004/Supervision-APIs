import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { CheckCircle, XCircle, Loader } from 'lucide-react'
import { Layout } from '../components/layout/Layout'
import api from '../services/api'

interface InvitationAcceptPageProps {
  mode?: 'accept' | 'reject'
}

export const InvitationAcceptPage: React.FC<InvitationAcceptPageProps> = ({
  mode = 'accept',
}) => {
  const { invitationId } = useParams<{ invitationId: string }>()
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    handleInvitation()
  }, [invitationId, mode])

  const handleInvitation = async () => {
    if (!invitationId) {
      setError('Invitation ID manquant')
      setLoading(false)
      return
    }

    const token = localStorage.getItem('access_token')

    if (!token) {
      const redirectPath = window.location.pathname
      navigate(`/login?redirect=${encodeURIComponent(redirectPath)}`)
      return
    }

    try {
      setLoading(true)

      const endpoint =
        mode === 'reject'
          ? `/teams/invitations/${invitationId}/reject`
          : `/teams/invitations/${invitationId}/accept`

      await api.post(endpoint)

      setSuccess(true)

      setTimeout(() => {
        navigate('/teams')
      }, 1800)
    } catch (e: any) {
      console.error('Erreur invitation:', e)
      setError(
        e.response?.data?.detail ||
          e.message ||
          "Erreur lors du traitement de l'invitation"
      )
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <Layout>
        <div style={centerStyle}>
          <Loader
            size={52}
            color="#E07FA0"
            style={{
              animation: 'spin 1.5s linear infinite',
              marginBottom: 20,
            }}
          />

          <h2 style={titleStyle}>
            {mode === 'reject'
              ? "Refus de l'invitation..."
              : "Acceptation de l'invitation..."}
          </h2>

          <p style={textStyle}>Merci de patienter pendant le traitement.</p>

          <style>{`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      </Layout>
    )
  }

  if (success) {
    return (
      <Layout>
        <div style={centerStyle}>
          <CheckCircle size={82} color="#10b981" style={{ marginBottom: 22 }} />

          <h2 style={titleStyle}>
            {mode === 'reject'
              ? 'Invitation refusée'
              : 'Invitation acceptée ! 🎉'}
          </h2>

          <p style={textStyle}>
            {mode === 'reject'
              ? "L'invitation a été refusée avec succès."
              : "Vous avez rejoint l'équipe avec succès."}
          </p>

          <p style={{ ...textStyle, fontSize: 13, marginTop: 18 }}>
            Redirection vers vos équipes...
          </p>

          <button onClick={() => navigate('/teams')} style={buttonStyle}>
            Aller à mes équipes
          </button>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div style={centerStyle}>
        <XCircle size={82} color="#ef4444" style={{ marginBottom: 22 }} />

        <h2 style={titleStyle}>Erreur</h2>

        <p style={textStyle}>
          {error || "Impossible de traiter l'invitation."}
        </p>

        <button onClick={() => navigate('/teams')} style={buttonStyle}>
          Aller à mes équipes
        </button>
      </div>
    </Layout>
  )
}

const centerStyle: React.CSSProperties = {
  minHeight: '70vh',
  padding: '80px 24px',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  textAlign: 'center',
}

const titleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: 28,
  fontWeight: 800,
  color: 'var(--text-primary)',
}

const textStyle: React.CSSProperties = {
  marginTop: 12,
  color: 'var(--text-muted)',
  fontSize: 15,
}

const buttonStyle: React.CSSProperties = {
  marginTop: 28,
  padding: '11px 18px',
  borderRadius: 10,
  border: 'none',
  background: '#E07FA0',
  color: '#fff',
  fontWeight: 800,
  cursor: 'pointer',
}