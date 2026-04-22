-- ─────────────────────────────────────────────────────────
-- 002_enums.sql
-- Crée les 7 types énumérés PostgreSQL
-- ─────────────────────────────────────────────────────────

CREATE TYPE httpmethod AS ENUM (
    'GET', 'POST', 'PUT', 'DELETE', 'PATCH'
);

CREATE TYPE ruletype AS ENUM (
    'LATENCY', 'ERROR_RATE', 'DOWNTIME'
);

CREATE TYPE severity AS ENUM (
    'INFO', 'WARNING', 'CRITICAL'
);

CREATE TYPE alertstatus AS ENUM (
    'OPEN', 'ACKNOWLEDGED', 'RESOLVED'
);

CREATE TYPE incidentstatus AS ENUM (
    'OPEN', 'RESOLVED', 'CLOSED'
);

CREATE TYPE channeltype AS ENUM (
    'EMAIL', 'WEBHOOK'
);

CREATE TYPE userrole AS ENUM (
    'ADMIN', 'DEV', 'MANAGER'
);
