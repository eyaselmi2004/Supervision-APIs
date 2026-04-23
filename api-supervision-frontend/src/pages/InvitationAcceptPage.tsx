import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { CheckCircle, XCircle, Loader } from 'lucide-react'
import { Layout } from '../components/layout/Layout'
import { Button } from '../components/ui/Button'
import api from '../services/api'
import { teamsService } from '../services/teams.service'
import { projectsService } from '../services/projects.service'

export const InvitationAcceptPage: React.FC = () => {
  const { invitationId } = useParams<{ invitationId: string }>()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [teamName, setTeamName] = useState<string | null>(null)

  useEffect(() => {
    acceptInvitation()
  }, [invitationId])

  const acceptInvitation = async () => {
    if (!invitationId) {
      setError('Invitation ID manquant')
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      console.log(`🔴 Acceptation invitation: ${invitationId}`)
      
      // Récupérer les infos de l'invitation depuis les pending invitations
      const invitationsResponse = await api.get('/teams/invitations/pending')
      const invitations = invitationsResponse.data
      
      console.log('📋 Invitations pending:', invitations)
      
      // Trouver l'invitation correspondante
      const invitation = invitations.find((inv: any) => inv.id === invitationId)
      
      if (!invitation) {
        setError('Invitation introuvable')
        setLoading(false)
        return
      }
      
      console.log('✅ Invitation trouvée:', invitation)
      
      const teamId = invitation.team_id
      const teamNameValue = invitation.name
      
      // Accepter l'invitation
      console.log(`🔴 Appel endpoint: /teams/${teamId}/accept-invitation`)
      const acceptResponse = await api.post(`/teams/${teamId}/accept-invitation`)
      
      console.log('✅ Réponse acceptation:', acceptResponse.data)
      
      // ✅ ÉTAPE 6 : Recharger les équipes et projets
      console.log('📚 Rechargement des équipes et projets...')
      try {
        await teamsService.getAll()
        await projectsService.getMyProjects()
        console.log('✅ Équipes et projets rechargés')
      } catch (e) {
        console.warn('⚠️ Erreur lors du rechargement:', e)
        // Continuer même si le rechargement échoue
      }
      
      setSuccess(true)
      setTeamName(teamNameValue)
      
      // Rediriger vers /projects après 3 secondes (au lieu de /teams)
      setTimeout(() => {
        navigate('/projects')
      }, 3000)
    } catch (e: any) {
      console.error('❌ Erreur acceptation:', e)
      const errorMsg = e.response?.data?.detail || e.message || 'Erreur lors de l\'acceptation'
      setError(errorMsg)
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <Layout>
        <div style={{ 
          padding: '100px 20px', 
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '60vh',
        }}>
          <Loader 
            size={48} 
            color="#d946ef" 
            style={{ animation: 'spin 2s linear infinite', marginBottom: '20px' }}
          />
          <p style={{ color: 'var(--text-muted)', fontSize: '16px' }}>
            Acceptation de l'invitation en cours...
          </p>
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
        <div style={{ 
          padding: '100px 20px', 
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '60vh',
        }}>
          <CheckCircle size={80} color="#10b981" style={{ marginBottom: '20px' }} />
          <h2 style={{ color: 'var(--text-primary)', margin: '0 0 10px 0', fontSize: '28px', fontWeight: 700 }}>
            Invitation acceptée ! 🎉
          </h2>
          <p style={{ color: 'var(--text-muted)', marginTop: '10px', fontSize: '16px' }}>
            Vous avez rejoint <strong>{teamName}</strong> avec succès.
          </p>
          <p style={{ color: 'var(--text-subtle)', marginTop: '20px', fontSize: '14px' }}>
            Redirection automatique vers vos projets dans 3 secondes...
          </p>
          <Button 
            onClick={() => navigate('/projects')} 
            style={{ marginTop: '30px' }}
          >
            Aller à mes projets
          </Button>
        </div>
      </Layout>
    )
  }

  if (error) {
    return (
      <Layout>
        <div style={{ 
          padding: '100px 20px', 
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '60vh',
        }}>
          <XCircle size={80} color="#ef4444" style={{ marginBottom: '20px' }} />
          <h2 style={{ color: 'var(--text-primary)', margin: '0 0 10px 0', fontSize: '28px', fontWeight: 700 }}>
            Erreur
          </h2>
          <p style={{ color: 'var(--text-muted)', marginTop: '10px', fontSize: '16px', maxWidth: '500px' }}>
            {error}
          </p>
          <Button 
            onClick={() => navigate('/projects')} 
            style={{ marginTop: '30px' }}
          >
            Aller à mes projets
          </Button>
        </div>
      </Layout>
    )
  }

  return null
}