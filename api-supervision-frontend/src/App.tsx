/**
 * App.tsx — Point d'entrée des routes de l'application
 *
 * Ce fichier définit toutes les routes de l'application React.
 * Chaque route est protégée par PrivateRoute qui vérifie
 * la présence d'un token JWT avant d'afficher la page.
 * Si pas de token → redirige automatiquement vers /login
 */

// ── Imports React ──────────────────────────────────────────
import React from 'react'

// ── Imports React Router ───────────────────────────────────
import { Routes, Route, Navigate } from 'react-router-dom'
// Routes   : conteneur de toutes les routes
// Route    : définit un chemin URL et le composant à afficher
// Navigate : redirige vers une autre URL

// ── Import protection de route ─────────────────────────────
import { PrivateRoute } from './components/ui/PrivateRoute'
// PrivateRoute : vérifie le token JWT dans localStorage
// Si token présent  → affiche le composant enfant
// Si token absent   → redirige vers /login

// ── Imports pages ──────────────────────────────────────────
import LandingPage from './pages/LandingPage'
// Landing page — public homepage with marketing content

import { LoginPage }         from './pages/LoginPage'
// Page publique — formulaire de connexion JWT

import { DashboardPage }     from './pages/DashboardPage'
// Page principale — statistiques globales de la plateforme

import { ProjectsPage }      from './pages/ProjectsPage'
// Grille des projets avec création/gestion

import { ApiServicesPage }   from './pages/ApiServicesPage'
// Liste des APIs supervisées avec leurs métriques

import { MetricsPage }       from './pages/MetricsPage'
// Graphiques de métriques par endpoint et par période

import { AlertsPage }        from './pages/AlertsPage'
// Alertes déclenchées + règles de surveillance configurables

import { IncidentsPage }     from './pages/IncidentsPage'
// Incidents de panne avec cycle de vie OPEN → RESOLVED

import { SlaPage }           from './pages/SlaPage'
// Rapports SLA : disponibilité, latence, taux d'erreur

import { NotificationsPage } from './pages/NotificationsPage'
// Canaux de notification : EMAIL, WEBHOOK (Slack/Teams)

import { UsersPage }         from './pages/UsersPage'
// Gestion des utilisateurs
import { TeamsPage } from './pages/TeamsPage'

import { InvitationAcceptPage } from './pages/InvitationAcceptPage'

import { ProjectDetailsPage } from './pages/ProjectDetailsPage'



// ════════════════════════════════════════════════════════════
// COMPOSANT APP — Définition de toutes les routes
// ════════════════════════════════════════════════════════════
const App: React.FC = () => (
  <Routes>

    {/* ── Landing Page ──────────────────────────────────
        Public homepage — default route
        Accessible without authentication ─────────────── */}
    <Route
      path="/"
      element={<LandingPage />}
    />

    {/* ── Login Page ────────────────────────────────────
        Public route — JWT login form */}
    <Route
      path="/login"
      element={<LoginPage />}
    />

    {/* ── Routes protégées ────────────────────────────────
        Chaque route est enveloppée dans <PrivateRoute>
        PrivateRoute vérifie le token JWT :
          - Token valide   → affiche la page
          - Token invalide → redirige vers /login ──────── */}

    {/* Dashboard — page d'accueil après connexion */}
    <Route
      path="/dashboard"
      element={
        <PrivateRoute>
          <DashboardPage />
        </PrivateRoute>
      }
    />

    {/* Projets — sélection et gestion des projets */}
    <Route
      path="/projects"
      element={
        <PrivateRoute>
          <ProjectsPage />
        </PrivateRoute>
      }
    />

    {/* APIs supervisées */}
    <Route
      path="/api-services"
      element={
        <PrivateRoute>
          <ApiServicesPage />
        </PrivateRoute>
      }
    />

    {/* Métriques */}
    <Route
      path="/metrics"
      element={
        <PrivateRoute>
          <MetricsPage />
        </PrivateRoute>
      }
    />

    {/* Alertes + Règles */}
    <Route
      path="/alerts"
      element={
        <PrivateRoute>
          <AlertsPage />
        </PrivateRoute>
      }
    />

    {/* Incidents */}
    <Route
      path="/incidents"
      element={
        <PrivateRoute>
          <IncidentsPage />
        </PrivateRoute>
      }
    />

    {/* Rapports SLA */}
    <Route
      path="/sla"
      element={
        <PrivateRoute>
          <SlaPage />
        </PrivateRoute>
      }
    />

    {/* Canaux de notification */}
    <Route
      path="/notifications"
      element={
        <PrivateRoute>
          <NotificationsPage />
        </PrivateRoute>
      }
    />

    {/* Utilisateurs */}
    <Route
      path="/users"
      element={
        <PrivateRoute>
          <UsersPage />
        </PrivateRoute>
      }
    />
    <Route 
      path="/teams" 
      element={
        <PrivateRoute>
          <TeamsPage />
        </PrivateRoute>} />

    {/* ── Redirection par défaut ───────────────────────────
        Toute URL inconnue → redirige vers le Dashboard
        replace = true : remplace l'entrée dans l'historique
        (le bouton "retour" ne revient pas sur l'URL inconnue) */}
    <Route
      path="*"
      element={<Navigate to="/" replace />}
    />
    <Route
      path="/invitations/:invitationId/accept" element={<InvitationAcceptPage />} />
    
    <Route path="/projects/:projectId" element={<ProjectDetailsPage />} />

  </Routes>
  
)

export default App