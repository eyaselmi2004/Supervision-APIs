WITH ranked AS (
    SELECT
        id,
        api_service_id,
        path,
        method,
        ROW_NUMBER() OVER (
            PARTITION BY api_service_id, path, method
            ORDER BY id
        ) AS rn,
        FIRST_VALUE(id) OVER (
            PARTITION BY api_service_id, path, method
            ORDER BY id
        ) AS keep_id
    FROM endpoints
),
duplicates AS (
    SELECT
        id AS duplicate_id,
        keep_id
    FROM ranked
    WHERE rn > 1
)
UPDATE api_metrics m
SET endpoint_id = d.keep_id
FROM duplicates d
WHERE m.endpoint_id = d.duplicate_id;

WITH ranked AS (
    SELECT
        id,
        ROW_NUMBER() OVER (
            PARTITION BY api_service_id, path, method
            ORDER BY id
        ) AS rn
    FROM endpoints
)
DELETE FROM endpoints e
USING ranked r
WHERE e.id = r.id
  AND r.rn > 1;