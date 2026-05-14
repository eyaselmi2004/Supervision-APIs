import React from 'react'
import { useNavigate } from 'react-router-dom'
import { PlusCircle, Users, ArrowRight } from 'lucide-react'

export const OnboardingPage: React.FC = () => {
  const navigate = useNavigate()

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg-main)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
      fontFamily: "'Inter', system-ui, sans-serif",
    }}>
      <div style={{ width: '100%', maxWidth: 780 }}>
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <h1 style={{
            fontSize: 34,
            fontWeight: 900,
            color: 'var(--text-primary)',
            margin: '0 0 10px',
          }}>
            Welcome to Traceon
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 15, margin: 0 }}>
            Create a team or join an existing one to start monitoring your APIs.
          </p>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
          gap: 18,
        }}>
          <button
            onClick={() => navigate('/teams/create')}
            style={cardStyle}
          >
            <PlusCircle size={34} color="#E07FA0" />
            <h2 style={titleStyle}>Create a team</h2>
            <p style={textStyle}>
              Start a new workspace and become the owner of this team.
            </p>
            <span style={actionStyle}>
              Continue <ArrowRight size={16} />
            </span>
          </button>

          <button onClick={() => navigate('/teams?join=true')} style={cardStyle}>
            
            <Users size={34} color="#8b5cf6" />
            <h2 style={titleStyle}>Join a team</h2>
            <p style={textStyle}>
              Accept an invitation or join a team already created by an admin.
            </p>
            <span style={actionStyle}>
              View teams <ArrowRight size={16} />
            </span>
          </button>
        </div>
      </div>
    </div>
  )
}

const cardStyle: React.CSSProperties = {
  textAlign: 'left',
  padding: 28,
  borderRadius: 18,
  border: '1px solid var(--border)',
  background: 'var(--background-card)',
  cursor: 'pointer',
  transition: 'transform 0.15s, border-color 0.15s',
}

const titleStyle: React.CSSProperties = {
  fontSize: 20,
  fontWeight: 850,
  color: 'var(--text-primary)',
  margin: '18px 0 8px',
}

const textStyle: React.CSSProperties = {
  color: 'var(--text-muted)',
  fontSize: 14,
  lineHeight: 1.6,
  margin: 0,
}

const actionStyle: React.CSSProperties = {
  marginTop: 22,
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  color: '#E07FA0',
  fontWeight: 800,
  fontSize: 13,
}