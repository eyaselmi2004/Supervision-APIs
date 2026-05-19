import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

export const OAuthSuccessPage: React.FC = () => {
  const navigate = useNavigate()
  const [message, setMessage] = useState('Connexion OAuth en cours...')

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)

    const accessToken = params.get('access_token')
    const refreshToken = params.get('refresh_token')

    console.log('OAuth success URL:', window.location.href)
    console.log('Access token exists:', !!accessToken)
    console.log('Refresh token exists:', !!refreshToken)

    if (!accessToken || !refreshToken) {
      setMessage('Token OAuth manquant. Redirection...')
      setTimeout(() => {
        navigate('/login', { replace: true })
      }, 1000)
      return
    }

    localStorage.setItem('access_token', accessToken)
    localStorage.setItem('refresh_token', refreshToken)

    setMessage('Connexion réussie. Redirection vers le dashboard...')

    setTimeout(() => {
      window.location.href = '/dashboard'
    }, 500)
  }, [navigate])

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#0b1020',
        color: '#ffffff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'Inter, system-ui, sans-serif',
        fontSize: '16px',
        fontWeight: 700,
      }}
    >
      {message}
    </div>
  )
}