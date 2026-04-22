-- ─────────────────────────────────────────────────────────
-- 006_continuous_agg.sql
-- Vue matérialisée continue rafraîchie automatiquement
-- Pré-calcule les stats par heure — utilisée par le dashboard
-- ─────────────────────────────────────────────────────────

CREATE MATERIALIZED VIEW api_metrics_hourly
WITH (timescaledb.continuous) AS
SELECT
    time_bucket('1 hour', timestamp)                          AS bucket,
    endpoint_id,
    COUNT(*)                                                   AS total_requests,
    AVG(response_time_ms)                                      AS avg_response_time_ms,
    MIN(response_time_ms)                                      AS min_response_time_ms,
    MAX(response_time_ms)                                      AS max_response_time_ms,
    SUM(CASE WHEN success = FALSE THEN 1 ELSE 0 END)          AS error_count,
    SUM(CASE WHEN success = TRUE  THEN 1 ELSE 0 END)          AS success_count
FROM api_metrics
GROUP BY bucket, endpoint_id
WITH NO DATA;

-- Politique de rafraîchissement automatique toutes les heures
SELECT add_continuous_aggregate_policy(
    'api_metrics_hourly',
    start_offset      => INTERVAL '3 hours',
    end_offset        => INTERVAL '1 hour',
    schedule_interval => INTERVAL '1 hour',
    if_not_exists     => TRUE
);
