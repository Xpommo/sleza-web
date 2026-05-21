/**
 * Database layer — Supabase PostgreSQL via postgres.js
 *
 * Tables:
 *   scans  — scan results stored by UUID (replaces backend/results/*.json files)
 *   leads  — email captures (replaces backend/leads.jsonl)
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
      site_type   TEXT,
      mode        TEXT,
      use_ai      BOOLEAN     DEFAULT false,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      result_json JSONB       NOT NULL,
      ip          TEXT
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS leads (
      id          SERIAL      PRIMARY KEY,
      email       TEXT        NOT NULL,
      company     TEXT        NOT NULL,
      scan_uuid   TEXT        REFERENCES scans(uuid) ON DELETE SET NULL,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_scans_url_created ON scans(url, created_at DESC)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_scans_created ON scans(created_at)`;
  console.log('[db] schema ready');
}

// ── Scans ───────────────────────────────────────────────────────────────────

export async function saveScan({ uuid, url, siteType = 'auto', mode = 'single', useAI = false, result, ip = null }) {
  if (!enabled) return;
  await sql`
    INSERT INTO scans (uuid, url, site_type, mode, use_ai, result_json, ip)
    VALUES (${uuid}, ${url}, ${siteType}, ${mode}, ${useAI}, ${result}, ${ip})
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

// Delete scans older than N days (call periodically to keep storage lean)
export async function cleanupOldScans(olderThanDays = 7) {
  if (!enabled) return 0;
  const result = await sql`
    DELETE FROM scans
    WHERE created_at < NOW() - MAKE_INTERVAL(days => ${olderThanDays})
  `;
  return result.count;
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
