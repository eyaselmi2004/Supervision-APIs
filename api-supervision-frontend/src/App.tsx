import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'

import { PrivateRoute } from './components/ui/PrivateRoute'

import LandingPage from './pages/LandingPage'
import { LoginPage } from './pages/LoginPage'
import { RegisterPage } from './pages/RegisterPage'
import { OnboardingPage } from './pages/OnboardingPage'
import { OAuthSuccessPage } from './pages/OAuthSuccessPage'

import { DashboardPage } from './pages/DashboardPage'
import { ProjectsPage } from './pages/ProjectsPage'
import { ProjectDetailsPage } from './pages/ProjectDetailsPage'

import { TeamsPage } from './pages/TeamsPage'
import { CreateTeamPage } from './pages/CreateTeamPage'
import { InvitationAcceptPage } from './pages/InvitationAcceptPage'

import { ApiServicesPage } from './pages/ApiServicesPage'
import { MetricsPage } from './pages/MetricsPage'
import { AlertsPage } from './pages/AlertsPage'
import { IncidentsPage } from './pages/IncidentsPage'
import { SlaPage } from './pages/SlaPage'
import { NotificationsPage } from './pages/NotificationsPage'
import { UsersPage } from './pages/UsersPage'
import { VerifyEmailPage } from './pages/VerifyEmailPage'

const App: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/verify-email" element={<VerifyEmailPage />} />

      <Route path="/oauth-success" element={<OAuthSuccessPage />} />

      <Route
        path="/onboarding"
        element={
          <PrivateRoute>
            <OnboardingPage />
          </PrivateRoute>
        }
      />

      <Route
        path="/dashboard"
        element={
          <PrivateRoute>
            <DashboardPage />
          </PrivateRoute>
        }
      />

      <Route
        path="/projects"
        element={
          <PrivateRoute>
            <ProjectsPage />
          </PrivateRoute>
        }
      />

      <Route
        path="/projects/:projectId"
        element={
          <PrivateRoute>
            <ProjectDetailsPage />
          </PrivateRoute>
        }
      />

      <Route
        path="/teams"
        element={
          <PrivateRoute>
            <TeamsPage />
          </PrivateRoute>
        }
      />

      <Route
        path="/teams/create"
        element={
          <PrivateRoute>
            <CreateTeamPage />
          </PrivateRoute>
        }
      />

      <Route
        path="/teams/invitations/:invitationId/accept"
        element={<InvitationAcceptPage mode="accept" />}
      />

      <Route
        path="/teams/invitations/:invitationId/reject"
        element={<InvitationAcceptPage mode="reject" />}
      />

      <Route
        path="/api-services"
        element={
          <PrivateRoute>
            <ApiServicesPage />
          </PrivateRoute>
        }
      />

      <Route
        path="/metrics"
        element={
          <PrivateRoute>
            <MetricsPage />
          </PrivateRoute>
        }
      />

      <Route
        path="/alerts"
        element={
          <PrivateRoute>
            <AlertsPage />
          </PrivateRoute>
        }
      />

      <Route
        path="/incidents"
        element={
          <PrivateRoute>
            <IncidentsPage />
          </PrivateRoute>
        }
      />

      <Route
        path="/sla"
        element={
          <PrivateRoute>
            <SlaPage />
          </PrivateRoute>
        }
      />

      <Route
        path="/notifications"
        element={
          <PrivateRoute>
            <NotificationsPage />
          </PrivateRoute>
        }
      />

      <Route
        path="/users"
        element={
          <PrivateRoute>
            <UsersPage />
          </PrivateRoute>
        }
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App