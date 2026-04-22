
-- 003_tables.sql
 --Crée les 9 tables relationnelles


--users 
CREATE TABLE users (
    id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    name             VARCHAR(100) NOT NULL,
    email            VARCHAR(255) NOT NULL UNIQUE,
    hashed_password  VARCHAR(255) NOT NULL,
    role             userrole    NOT NULL DEFAULT 'DEV',
    is_active        BOOLEAN     NOT NULL DEFAULT TRUE,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX ix_users_email ON users (email);

--api_services
CREATE TABLE api_services (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    name        VARCHAR(100) NOT NULL,
    base_url    VARCHAR(500) NOT NULL,
    is_active   BOOLEAN     NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

--endpoints 
-- Composition 1→* avec api_services (CASCADE DELETE)
CREATE TABLE endpoints (
    id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    api_service_id UUID        NOT NULL REFERENCES api_services(id) ON DELETE CASCADE,
    path           VARCHAR(500) NOT NULL,
    method         httpmethod  NOT NULL,
    is_active      BOOLEAN     NOT NULL DEFAULT TRUE
);

CREATE INDEX ix_endpoints_api_service_id ON endpoints (api_service_id);

-- api_metrics 
-- Clé primaire composite (id, timestamp) obligatoire pour TimescaleDB
-- Cette table sera convertie en hypertable dans 004_hypertable.sql
CREATE TABLE api_metrics (
    id               UUID        NOT NULL DEFAULT gen_random_uuid(),
    endpoint_id      UUID        NOT NULL REFERENCES endpoints(id) ON DELETE CASCADE,
    timestamp        TIMESTAMPTZ NOT NULL,
    response_time_ms FLOAT       NOT NULL,
    status_code      INTEGER     NOT NULL,
    success          BOOLEAN     NOT NULL,
    PRIMARY KEY (id, timestamp)
);

CREATE INDEX ix_api_metrics_endpoint_id ON api_metrics (endpoint_id, timestamp DESC);
CREATE INDEX ix_api_metrics_timestamp   ON api_metrics (timestamp DESC);

-- sla_reports
CREATE TABLE sla_reports (
    id                   UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
    endpoint_id          UUID    NOT NULL REFERENCES endpoints(id) ON DELETE CASCADE,
    period_start         TIMESTAMPTZ NOT NULL,
    period_end           TIMESTAMPTZ NOT NULL,
    availability_percent FLOAT   NOT NULL,
    error_rate_percent   FLOAT   NOT NULL,
    avg_latency_ms       FLOAT   NOT NULL,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX ix_sla_reports_endpoint_id ON sla_reports (endpoint_id);

-- alert_rules 
CREATE TABLE alert_rules (
    id             UUID      PRIMARY KEY DEFAULT gen_random_uuid(),
    endpoint_id    UUID      NOT NULL REFERENCES endpoints(id) ON DELETE CASCADE,
    owner_id       UUID      REFERENCES users(id) ON DELETE SET NULL,
    name           VARCHAR(200) NOT NULL,
    type           ruletype  NOT NULL,
    threshold      FLOAT     NOT NULL,
    window_seconds INTEGER   NOT NULL DEFAULT 60,
    is_enabled     BOOLEAN   NOT NULL DEFAULT TRUE
);

CREATE INDEX ix_alert_rules_endpoint_id ON alert_rules (endpoint_id);

--alerts
CREATE TABLE alerts (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    rule_id         UUID        NOT NULL REFERENCES alert_rules(id) ON DELETE CASCADE,
    managed_by_id   UUID        REFERENCES users(id) ON DELETE SET NULL,
    message         TEXT        NOT NULL,
    severity        severity    NOT NULL,
    status          alertstatus NOT NULL DEFAULT 'OPEN',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    acknowledged_at TIMESTAMPTZ,
    resolved_at     TIMESTAMPTZ
);

CREATE INDEX ix_alerts_created_at ON alerts (created_at DESC);
CREATE INDEX ix_alerts_status     ON alerts (status);

-- incidents 
CREATE TABLE incidents (
    id             UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
    api_service_id UUID           NOT NULL REFERENCES api_services(id) ON DELETE CASCADE,
    source_alert_id UUID          REFERENCES alerts(id) ON DELETE SET NULL,
    title          VARCHAR(300)   NOT NULL,
    start_time     TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
    end_time       TIMESTAMPTZ,
    status         incidentstatus NOT NULL DEFAULT 'OPEN',
    resolution     TEXT
);

CREATE INDEX ix_incidents_api_service_id ON incidents (api_service_id);

-- notification_channels 
CREATE TABLE notification_channels (
    id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    name       VARCHAR(100) NOT NULL,
    type       channeltype NOT NULL,
    target     VARCHAR(500) NOT NULL,
    is_enabled BOOLEAN     NOT NULL DEFAULT TRUE
);

-- alert_channel_association  (* ↔ *) 
CREATE TABLE alert_channel_association (
    alert_id   UUID NOT NULL REFERENCES alerts(id) ON DELETE CASCADE,
    channel_id UUID NOT NULL REFERENCES notification_channels(id) ON DELETE CASCADE,
    PRIMARY KEY (alert_id, channel_id)
);
