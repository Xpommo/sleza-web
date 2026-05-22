/**
 * Database layer — Supabase PostgreSQL via postgres.js
 *
 * Tables:
 *   scans    — scan results stored by UUID (replaces backend/results/*.json files)
 *   leads    — email captures (replaces backend/leads.jsonl)
 *   feedback — operator verdicts on check results (confirm / false_positive)
 *
 * If DATABASE_URL is not set the module exports no-op stubs so the app
 * still works without a DB (local dev, smoke tests).
 */
import postgres from 'postgres';

const DATABASE_URL = process.env.DATABASE_URL;

let sql;
let enabled = false;

if (DATABASE_URL) {
  sql = postgres(DATABASE_URL, {
    max: 5,
    idle_timeout: 20,
    connect_timeout: 10,
    ssl: 'require',
    onnotice: () => {}, // suppress IF NOT EXISTS notices
  });
  enabled = true;
} else {
  console.warn('[db] DATABASE_URL not set — running without persistent storage');
}

// ── Schema migration (run once on startup) ──────────────────────────────────

export async function initSchema() {
  if (!enabled) return;
  await sql`
    CREATE TABLE IF NOT EXISTS scans (
      uuid        TEXT        PRIMARY KEY,
      url         TEXT        NOT NULL,
      hostname    TEXT,
      site_type   TEXT,
      mode        TEXT,
      use_ai      BOOLEAN     DEFAULT false,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      result_json JSONB       NOT NULL,
      ip          TEXT
    )
  `;
  // Add hostname to existing tables (no-op if already present)
  await sql`ALTER TABLE scans ADD COLUMN IF NOT EXISTS hostname TEXT`;
  await sql`
    CREATE TABLE IF NOT EXISTS leads (
      id          SERIAL      PRIMARY KEY,
      email       TEXT        NOT NULL,
      company     TEXT        NOT NULL,
      scan_uuid   TEXT        REFERENCES scans(uuid) ON DELETE SET NULL,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS feedback (
      id          BIGSERIAL   PRIMARY KEY,
      scan_uuid   TEXT        NOT NULL REFERENCES scans(uuid) ON DELETE CASCADE,
      check_id    TEXT        NOT NULL,
      verdict     TEXT        NOT NULL CHECK (verdict IN ('confirm', 'false_positive')),
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_scans_url_created ON scans(url, created_at DESC)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_scans_created ON scans(created_at)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_scans_hostname_created ON scans(hostname, created_at DESC)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_feedback_scan_uuid ON feedback(scan_uuid)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_feedback_check_id ON feedback(check_id)`;
  console.log('[db] schema ready');
}

// ── Scans ───────────────────────────────────────────────────────────────────

export async function saveScan({ uuid, url, siteType = 'auto', mode = 'single', useAI = false, result, ip = null }) {
  if (!enabled) return;
  let hostname = null;
  try { hostname = new URL(url).hostname.toLowerCase(); } catch { /* invalid url */ }
  await sql`
    INSERT INTO scans (uuid, url, hostname, site_type, mode, use_ai, result_json, ip)
    VALUES (${uuid}, ${url}, ${hostname}, ${siteType}, ${mode}, ${useAI}, ${result}, ${ip})
    ON CONFLICT (uuid) DO NOTHING
  `;
}

export async function getScan(uuid) {
  if (!enabled) return null;
  const rows = await sql`SELECT * FROM scans WHERE uuid = ${uuid}`;
  return rows[0] || null;
}

// Returns a recent cached scan for the same URL+params, or null
export async function findCachedScan(url, siteType = 'auto', useAI = false, maxAgeMinutes = 20) {
  if (!enabled) return null;
  const rows = await sql`
    SELECT * FROM scans
    WHERE url      = ${url}
      AND site_type = ${siteType}
      AND use_ai    = ${useAI}
      AND created_at > NOW() - MAKE_INTERVAL(mins => ${maxAgeMinutes})
    ORDER BY created_at DESC
    LIMIT 1
  `;
  return rows[0] || null;
}

// Delete scans older than N days, but always keep the most recent scan per hostname.
export async function cleanupOldScans(olderThanDays = 7) {
  if (!enabled) return 0;
  const result = await sql`
    DELETE FROM scans
    WHERE created_at < NOW() - MAKE_INTERVAL(days => ${olderThanDays})
      AND uuid NOT IN (
        SELECT DISTINCT ON (hostname) uuid
        FROM scans
        WHERE hostname IS NOT NULL
        ORDER BY hostname, created_at DESC
      )
  `;
  return result.count;
}

// Returns the most recent scan for a given hostname, or null.
export async function getLastScanForDomain(hostname) {
  if (!enabled || !hostname) return null;
  const rows = await sql`
    SELECT uuid, result_json, created_at
    FROM scans
    WHERE hostname = ${hostname}
    ORDER BY created_at DESC
    LIMIT 1
  `;
  return rows[0] || null;
}

// ── Analytics ───────────────────────────────────────────────────────────────

// Aggregate check statuses across all scans — used for diagnosing false positives.
export async function getCheckStats(days = 30) {
  if (!enabled) return [];
  return sql`
    SELECT
      elem->>'id'     AS check_id,
      elem->>'status' AS status,
      s.site_type,
      COUNT(*)::int   AS cnt
    FROM scans s,
      jsonb_array_elements(s.result_json->'aiData'->'checks') AS elem
    WHERE s.created_at > NOW() - MAKE_INTERVAL(days => ${days})
      AND s.result_json->'aiData'->'checks' IS NOT NULL
    GROUP BY check_id, status, s.site_type
    ORDER BY check_id, status, cnt DESC
  `;
}

// Find individual scans where a specific check has a given status.
export async function findScansWithStatus(checkId, status, days = 30) {
  if (!enabled) return [];
  const filter = JSON.stringify([{ id: checkId, status }]);
  return sql`
    SELECT uuid, url, site_type, created_at,
           result_json->'aiData'->'checks' AS checks
    FROM scans
    WHERE created_at > NOW() - MAKE_INTERVAL(days => ${days})
      AND result_json->'aiData'->'checks' @> ${filter}::jsonb
    ORDER BY created_at DESC
    LIMIT 50
  `;
}

// ── Feedback ─────────────────────────────────────────────────────────────────

export async function saveFeedback({ scanUuid, checkId, verdict }) {
  if (!enabled) return null;
  const rows = await sql`
    INSERT INTO feedback (scan_uuid, check_id, verdict)
    VALUES (${scanUuid}, ${checkId}, ${verdict})
    RETURNING id
  `;
  return rows[0]?.id ?? null;
}

export async function getFeedbackStats() {
  if (!enabled) return [];
  return sql`
    SELECT check_id, verdict, COUNT(*)::int AS count
    FROM feedback
    GROUP BY check_id, verdict
    ORDER BY check_id, verdict
  `;
}

// ── Leads ───────────────────────────────────────────────────────────────────

export async function saveLead({ email, company, scanUuid = null }) {
  if (!enabled) return;
  await sql`
    INSERT INTO leads (email, company, scan_uuid)
    VALUES (${email}, ${company}, ${scanUuid})
  `;
}

export { enabled as dbEnabled };
