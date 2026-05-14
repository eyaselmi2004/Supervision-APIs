import React, { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { CheckCircle, XCircle, Loader } from 'lucide-react'
import api from '../services/api'

export const VerifyEmailPage: React.FC = () => {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  const hasRun = useRef(false)

  const [loading, setLoading] = useState(true)
  const [success, setSuccess] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (hasRun.current) return
    hasRun.current = true

    verifyEmail()
  }, [])

  const verifyEmail = async () => {
    const token = searchParams.get('token')

    if (!token) {
      setMessage('Token de vérification manquant')
      setSuccess(false)
      setLoading(false)
      return
    }

    try {
      const response = await api.get(`/auth/verify-email?token=${token}`)

      setMessage(response.data.message || 'Adresse email vérifiée avec succès')
      setSuccess(true)

      setTimeout(() => {
        navigate('/login')
      }, 2500)
    } catch (e: any) {
      setMessage(e.response?.data?.detail || 'Erreur lors de la vérification')
      setSuccess(false)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={pageStyle}>
      <div style={cardStyle}>
        {loading ? (
          <>
            <Loader size={64} color="#E07FA0" style={{ marginBottom: 20 }} />
            <h2 style={titleStyle}>Vérification en cours...</h2>
            <p style={textStyle}>Merci de patienter.</p>
          </>
        ) : success ? (
          <>
            <CheckCircle size={76} color="#10b981" style={{ marginBottom: 22 }} />
            <h2 style={titleStyle}>Email vérifié avec succès ✅</h2>
            <p style={textStyle}>{message}</p>
            <p style={textStyle}>Redirection vers la page de connexion...</p>

            <button onClick={() => navigate('/login')} style={buttonStyle}>
              Aller à la connexion
            </button>
          </>
        ) : (
          <>
            <XCircle size={76} color="#ef4444" style={{ marginBottom: 22 }} />
            <h2 style={titleStyle}>Erreur</h2>
            <p style={textStyle}>{message}</p>

            <button onClick={() => navigate('/login')} style={buttonStyle}>
              Aller à la connexion
            </button>
          </>
        )}
      </div>
    </div>
  )
}

const pageStyle: React.CSSProperties = {
  minHeight: '100vh',
  background: 'var(--bg-main)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 24,
  fontFamily: "'Inter', system-ui, sans-serif",
}

const cardStyle: React.CSSProperties = {
  width: '100%',
  maxWidth: 480,
  background: 'var(--background-card)',
  border: '1px solid var(--border)',
  borderRadius: 18,
  padding: 38,
  textAlign: 'center',
}

const titleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: 26,
  fontWeight: 900,
  color: 'var(--text-primary)',
}

const textStyle: React.CSSProperties = {
  marginTop: 12,
  color: 'var(--text-muted)',
  fontSize: 15,
}

const buttonStyle: React.CSSProperties = {
  marginTop: 26,
  padding: '12px 18px',
  borderRadius: 10,
  border: 'none',
  background: '#E07FA0',
  color: '#fff',
  fontWeight: 800,
  cursor: 'pointer',
}