-- ─────────────────────────────────────────────────────────
-- 004_hypertable.sql
-- Convertit api_metrics en hypertable TimescaleDB
-- partitionnée par timestamp (chunks de 1 jour)
-- ─────────────────────────────────────────────────────────

SELECT create_hypertable(
    'api_metrics',
    'timestamp',
    chunk_time_interval => INTERVAL '1 day',
    if_not_exists       => TRUE
);
