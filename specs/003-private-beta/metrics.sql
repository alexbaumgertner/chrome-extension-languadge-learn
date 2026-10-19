-- Private-beta usage metrics over the `events` table (apps/cms/src/db.ts).
--
-- One row per event: install_id (random UUID from the extension), name, occurred_on (UTC day),
-- and per-kind fields: cache + latency_ms (paragraph_translated), error_code + http_status
-- (client_error). No text, URL or IP is stored.
--
-- "Active" = any event other than `install` on that day. Install day = the install's first event
-- day (normally its `install` event). Paragraphs re-opened from the extension's local cache send
-- no event and are not counted. Days are UTC.
--
-- Each query starts with a `-- name:` line; apps/cms/tests/integration/metrics-sql.test.ts runs
-- them all against seeded data.

-- name: dau
-- Daily active installs, new installs, activity and translate error rate, last 30 days.
WITH days AS (
  SELECT generate_series(current_date - 29, current_date, interval '1 day')::date AS day
),
first_day AS (
  SELECT install_id, MIN(occurred_on) AS install_day FROM events GROUP BY install_id
)
SELECT
  d.day,
  COUNT(DISTINCT e.install_id) FILTER (WHERE e.name <> 'install') AS active_installs,
  (SELECT COUNT(*) FROM first_day f WHERE f.install_day = d.day) AS new_installs,
  COUNT(*) FILTER (WHERE e.name = 'paragraph_translated') AS paragraphs,
  COUNT(*) FILTER (WHERE e.name = 'paragraph_translated' AND e.cache = 'hit') AS cache_hits,
  COUNT(*) FILTER (WHERE e.name = 'exercise_completed') AS exercises,
  COUNT(*) FILTER (WHERE e.name = 'client_error') AS errors,
  ROUND(
    100.0 * COUNT(*) FILTER (WHERE e.error_code IN ('translate-failed', 'translate-offline'))
      / NULLIF(
        COUNT(*) FILTER (
          WHERE e.name = 'paragraph_translated'
             OR e.error_code IN ('translate-failed', 'translate-offline')
        ),
        0
      ),
    1
  ) AS translate_error_pct
FROM days d
LEFT JOIN events e ON e.occurred_on = d.day
GROUP BY d.day
ORDER BY d.day DESC;

-- name: retention
-- Classic D1/D3/D7: of the installs at least N days old, the share active exactly N days after
-- their install day.
WITH installs AS (
  SELECT install_id, MIN(occurred_on) AS install_day FROM events GROUP BY install_id
),
active AS (
  SELECT DISTINCT install_id, occurred_on FROM events WHERE name <> 'install'
),
cohort AS (
  SELECT
    n.day_n,
    i.install_id,
    EXISTS (
      SELECT 1 FROM active a
      WHERE a.install_id = i.install_id AND a.occurred_on = i.install_day + n.day_n
    ) AS retained
  FROM installs i
  CROSS JOIN (VALUES (1), (3), (7)) AS n (day_n)
  WHERE i.install_day + n.day_n <= current_date
)
SELECT
  n.day_n,
  COUNT(c.install_id) AS eligible_installs,
  COUNT(c.install_id) FILTER (WHERE c.retained) AS retained_installs,
  ROUND(100.0 * COUNT(c.install_id) FILTER (WHERE c.retained) / NULLIF(COUNT(c.install_id), 0), 1)
    AS retention_pct
FROM (VALUES (1), (3), (7)) AS n (day_n)
LEFT JOIN cohort c ON c.day_n = n.day_n
GROUP BY n.day_n
ORDER BY n.day_n;

-- name: per_install
-- Paragraphs per install (all time), with active days, server cache hits, exercises and errors.
SELECT
  left(install_id::text, 8) AS install,
  MIN(occurred_on) AS install_day,
  MAX(occurred_on) FILTER (WHERE name <> 'install') AS last_active_day,
  COUNT(DISTINCT occurred_on) FILTER (WHERE name <> 'install') AS active_days,
  COUNT(*) FILTER (WHERE name = 'paragraph_translated') AS paragraphs,
  COUNT(*) FILTER (WHERE name = 'paragraph_translated' AND cache = 'hit') AS cache_hits,
  ROUND(
    COUNT(*) FILTER (WHERE name = 'paragraph_translated')::numeric
      / NULLIF(COUNT(DISTINCT occurred_on) FILTER (WHERE name <> 'install'), 0),
    1
  ) AS paragraphs_per_active_day,
  COUNT(*) FILTER (WHERE name = 'exercise_completed') AS exercises,
  COUNT(*) FILTER (WHERE name = 'client_error') AS errors
FROM events
GROUP BY install_id
ORDER BY paragraphs DESC, install_day;

-- name: errors
-- Client errors by day, code and HTTP status (null status = no response: offline/DNS/CORS).
SELECT
  occurred_on AS day,
  error_code,
  http_status,
  COUNT(*) AS errors,
  COUNT(DISTINCT install_id) AS installs
FROM events
WHERE name = 'client_error' AND occurred_on > current_date - 30
GROUP BY occurred_on, error_code, http_status
ORDER BY day DESC, errors DESC;

-- name: latency
-- End-to-end /api/translate latency measured by the extension, by day and server cache result;
-- rows with day = NULL are the 30-day totals.
SELECT
  occurred_on AS day,
  cache,
  COUNT(*) AS requests,
  ROUND(percentile_cont(0.5) WITHIN GROUP (ORDER BY latency_ms)) AS p50_ms,
  ROUND(percentile_cont(0.95) WITHIN GROUP (ORDER BY latency_ms)) AS p95_ms
FROM events
WHERE name = 'paragraph_translated' AND occurred_on > current_date - 30
GROUP BY GROUPING SETS ((occurred_on, cache), (cache))
ORDER BY day DESC NULLS FIRST, cache;
