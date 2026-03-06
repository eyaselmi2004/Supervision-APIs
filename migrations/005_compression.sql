-- ─────────────────────────────────────────────────────────
-- 005_compression.sql
-- Compression automatique après 7 jours
-- Suppression automatique des métriques > 90 jours
-- ─────────────────────────────────────────────────────────

-- Activer la compression sur api_metrics
ALTER TABLE api_metrics
    SET (
        timescaledb.compress,
        timescaledb.compress_orderby   = 'timestamp DESC',
        timescaledb.compress_segmentby = 'endpoint_id'
    );

-- Compresser automatiquement les chunks de plus de 7 jours
SELECT add_compression_policy(
    'api_metrics',
    INTERVAL '7 days',
    if_not_exists => TRUE
);

-- Supprimer automatiquement les métriques de plus de 90 jours
SELECT add_retention_policy(
    'api_metrics',
    INTERVAL '90 days',
    if_not_exists => TRUE
);
