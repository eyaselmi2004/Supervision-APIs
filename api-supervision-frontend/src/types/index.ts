// ════════════════════════════════════════════════════════
// Types TypeScript — miroir exact des schémas Pydantic backend
// Chaque interface correspond à un schéma dans app/schemas/schemas.py
// ════════════════════════════════════════════════════════

// ── Auth ─────────────────────────────────────────────────
export interface LoginRequest {
  email: string
  password: string
}

export interface RegisterRequest {
  name: string
  email: string
  password: string
  role: 'ADMIN' | 'DEVOPS'
}

export interface TokenResponse {
  access_token: string
  refresh_token: string
  token_type: string
}

export interface UserResponse {
  id: string
  name: string
  email: string
  role: 'ADMIN' | 'DEVOPS'
  is_active: boolean
  created_at: string
}

// ── ApiService ───────────────────────────────────────────
export interface ApiService {
  id: string
  name: string
  base_url: string
  is_active: boolean
  created_at: string
}

export interface ApiServiceCreate {
  name: string
  base_url: string
  is_active: boolean
}

// ── Endpoint ─────────────────────────────────────────────
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'

export interface Endpoint {
  id: string
  api_service_id: string
  path: string
  method: HttpMethod
  is_active: boolean
}

export interface EndpointCreate {
  path: string
  method: HttpMethod
  is_active: boolean
}

// ── Metrics ──────────────────────────────────────────────
export interface ApiMetric {
  id: string
  endpoint_id: string
  timestamp: string
  response_time_ms: number
  status_code: number
  success: boolean
}

export interface MetricsStats {
  endpoint_id: string
  period_start: string
  period_end: string
  total_requests: number
  success_count: number
  error_count: number
  avg_response_time_ms: number
  min_response_time_ms: number
  max_response_time_ms: number
  error_rate_percent: number
}

export interface MetricsTimeSeries {
  bucket: string
  total_requests: number
  avg_response_time_ms: number
  error_count: number
}

// ── Alert Rules ──────────────────────────────────────────
export type RuleType = 'LATENCY' | 'ERROR_RATE' | 'DOWNTIME'

export interface AlertRule {
  id: string
  endpoint_id: string
  owner_id: string | null
  name: string
  type: RuleType
  threshold: number
  window_seconds: number
  is_enabled: boolean
}

export interface AlertRuleCreate {
  name: string
  type: RuleType
  threshold: number
  window_seconds: number
  endpoint_id: string
  is_enabled: boolean
}

// ── Alerts ───────────────────────────────────────────────
export type AlertStatus = 'OPEN' | 'ACKNOWLEDGED' | 'RESOLVED'
export type Severity    = 'INFO' | 'WARNING' | 'CRITICAL'


export interface Alert {
  id: string
  rule_id: string
  managed_by_id: string | null
  message: string
  severity: Severity
  status: AlertStatus
  created_at: string
  acknowledged_at: string | null
  resolved_at: string | null
  assigned_to_id?: string | null  // ← AJOUTÉ : ID de l'utilisateur assigné
}

// ── SLA ──────────────────────────────────────────────────
export interface SlaReport {
  id: string
  endpoint_id: string
  period_start: string
  period_end: string
  availability_percent: number
  error_rate_percent: number
  avg_latency_ms: number
  created_at: string
}

export interface SlaReportCreate {
  endpoint_id: string
  period_start: string
  period_end: string
}

// ── Incidents ────────────────────────────────────────────
export type IncidentStatus = 'OPEN' | 'RESOLVED' | 'CLOSED'

export interface Incident {
  id: string
  api_service_id: string
  source_alert_id: string | null
  title: string
  start_time: string
  end_time: string | null
  status: IncidentStatus
  resolution: string | null
  duration_minutes: number | null
}

export interface IncidentCreate {
  title: string
  api_service_id: string
  source_alert_id?: string
}

// ── Notifications ────────────────────────────────────────
export type ChannelType = 'EMAIL' | 'WEBHOOK'

export interface NotificationChannel {
  id: string
  name: string
  type: ChannelType
  target: string
  is_enabled: boolean
}

export interface NotificationChannelCreate {
  name: string
  type: ChannelType
  target: string
  is_enabled: boolean
}

// ── Générique ────────────────────────────────────────────
export interface MessageResponse {
  message: string
}

// ── Projects ───────────────────────────────────────────
export interface Project {
  id: string
  name: string
  description?: string
  icon_key?: string
  color?: string
  owner_id: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface ProjectCreate {
  name: string
  description?: string
  icon_key?: string
  color?: string
}

export interface ProjectStats {
  errors: number
  transactions: number
  crash_free_sessions: string
}


export interface EndpointDiscoveryResult {
  message: string
  service_id: string
  base_url: string
  discovered: number
  created: number
}

export interface EndpointTestResult {
  service_id: string
  endpoint_id: string
  method: string
  url: string
  status_code: number
  success: boolean
  response_time_ms: number
  response_preview: string
}

export interface ExplainIssueRequest {
  service_name: string
  method: string
  path: string
  avg_latency_ms: number
  p95_latency_ms: number
  error_rate_percent: number
  total_requests: number
  response_preview?: string
}

export interface ExplainIssueResponse {
  analysis: string
}