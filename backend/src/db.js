/**
 * Database layer — Supabase PostgreSQL via postgres.js
 *
 * Tables:
 *   scans             — scan results stored by UUID
 *   leads             — email captures
 *   feedback          — operator verdicts on check results (confirm / false_positive)
 *   domain_exceptions — auto-learned overrides from accumulated feedback (lifecycle: pending→verifying→active/disputed/expired)
 *   events            — funnel analytics (scan_done → doc_offer_shown → clicked → intake_submitted)
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
      issue_text  TEXT,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  // Add issue_text to existing feedback rows (no-op if already present)
  await sql`ALTER TABLE feedback ADD COLUMN IF NOT EXISTS issue_text TEXT`;
  await sql`
    CREATE TABLE IF NOT EXISTS domain_exceptions (
      id                   BIGSERIAL   PRIMARY KEY,
      hostname             TEXT        NOT NULL,
      check_id             TEXT        NOT NULL,
      override_status      TEXT        NOT NULL,
      status               TEXT        NOT NULL DEFAULT 'pending',
      false_positive_count INT         NOT NULL DEFAULT 1,
      confirm_count        INT         NOT NULL DEFAULT 0,
      verify_retries       INT         NOT NULL DEFAULT 0,
      verified_at          TIMESTAMPTZ,
      last_feedback        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      reason               TEXT,
      signals              JSONB,
      UNIQUE(hostname, check_id)
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_scans_url_created ON scans(url, created_at DESC)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_scans_created ON scans(created_at)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_scans_hostname_created ON scans(hostname, created_at DESC)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_feedback_scan_uuid ON feedback(scan_uuid)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_feedback_check_id ON feedback(check_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_domain_exc_hostname ON domain_exceptions(hostname)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_domain_exc_status ON domain_exceptions(status)`;
  await sql`
    CREATE TABLE IF NOT EXISTS monitoring_subscriptions (
      id           BIGSERIAL    PRIMARY KEY,
      email        TEXT         NOT NULL,
      hostname     TEXT         NOT NULL,
      scan_uuid    TEXT,
      active       BOOLEAN      DEFAULT true,
      created_at   TIMESTAMPTZ  DEFAULT NOW(),
      last_scan_at TIMESTAMPTZ,
      UNIQUE(email, hostname)
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_mon_sub_hostname ON monitoring_subscriptions(hostname)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_mon_sub_active ON monitoring_subscriptions(active)`;
  await sql`
    CREATE TABLE IF NOT EXISTS events (
      id          BIGSERIAL   PRIMARY KEY,
      type        TEXT        NOT NULL,
      scan_uuid   TEXT,
      hostname    TEXT,
      utm         JSONB,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_events_type_created ON events(type, created_at DESC)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_events_created ON events(created_at)`;
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

// Top violations across all scans — for public landing page stats.
export async function getTopViolations(limitDays = 90) {
  if (!enabled) return [];
  return sql`
    SELECT
      elem->>'id'   AS check_id,
      COUNT(*)::int AS cnt
    FROM scans s,
      jsonb_array_elements(s.result_json->'aiData'->'checks') AS elem
    WHERE s.result_json->'aiData'->'checks' IS NOT NULL
      AND elem->>'status' IN ('violation', 'risk')
      AND s.created_at > NOW() - MAKE_INTERVAL(days => ${limitDays})
    GROUP BY check_id
    ORDER BY cnt DESC
    LIMIT 6
  `;
}

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

export async function saveFeedback({ scanUuid, checkId, verdict, issueText = null }) {
  if (!enabled) return null;
  const rows = await sql`
    INSERT INTO feedback (scan_uuid, check_id, verdict, issue_text)
    VALUES (${scanUuid}, ${checkId}, ${verdict}, ${issueText})
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

// D — issue-pattern clustering for admin analytics
export async function getFeedbackPatterns() {
  if (!enabled) return [];
  // For local scans (use_ai=false): cluster by issue_text; for AI scans: cluster by status only
  return sql`
    SELECT
      f.check_id,
      COALESCE(f.issue_text, '(AI mode — issue text variable)') AS issue_pattern,
      COUNT(*) FILTER (WHERE f.verdict = 'false_positive')::int AS false_positive_count,
      COUNT(*) FILTER (WHERE f.verdict = 'confirm')::int         AS confirm_count,
      COUNT(DISTINCT s.hostname)::int                            AS unique_domains,
      MAX(f.created_at)                                          AS last_seen
    FROM feedback f
    JOIN scans s ON f.scan_uuid = s.uuid
    WHERE f.verdict = 'false_positive'
      AND f.issue_text IS NOT NULL
    GROUP BY f.check_id, f.issue_text
    HAVING COUNT(*) >= 2
    ORDER BY false_positive_count DESC
    LIMIT 50
  `;
}

// ── Domain Exceptions ────────────────────────────────────────────────────────

// Calculate safe override_status: law152/law149 max=risk, others can be ok
function calcOverrideStatus(checkId, originalStatus) {
  if (originalStatus === 'ok') return null; // nothing to override
  if (['law152', 'law149'].includes(checkId)) return 'risk';
  return 'ok';
}

// Upsert exception on false_positive feedback. Returns {count, status, shouldVerify}.
export async function upsertDomainException(hostname, checkId, originalStatus, signals = null) {
  if (!enabled) return null;
  const overrideStatus = calcOverrideStatus(checkId, originalStatus);
  if (!overrideStatus) return null; // already ok, nothing to do

  const rows = await sql`
    INSERT INTO domain_exceptions (hostname, check_id, override_status, signals, last_feedback)
    VALUES (${hostname}, ${checkId}, ${overrideStatus}, ${signals ? sql.json(signals) : null}, NOW())
    ON CONFLICT (hostname, check_id) DO UPDATE SET
      false_positive_count = domain_exceptions.false_positive_count + 1,
      last_feedback        = NOW(),
      signals              = COALESCE(${signals ? sql.json(signals) : null}, domain_exceptions.signals),
      status               = CASE
        WHEN domain_exceptions.status = 'expired' THEN 'pending'
        ELSE domain_exceptions.status
      END
    RETURNING false_positive_count, status
  `;
  const row = rows[0];
  if (!row) return null;
  const shouldVerify = row.false_positive_count >= 2 && row.status === 'pending';
  if (shouldVerify) {
    await sql`
      UPDATE domain_exceptions SET status = 'verifying'
      WHERE hostname = ${hostname} AND check_id = ${checkId} AND status = 'pending'
    `;
  }
  return { count: row.false_positive_count, status: shouldVerify ? 'verifying' : row.status, shouldVerify };
}

export async function activateDomainException(hostname, checkId, reason, signals = null) {
  if (!enabled) return;
  await sql`
    UPDATE domain_exceptions SET
      status      = 'active',
      verified_at = NOW(),
      reason      = ${reason},
      signals     = COALESCE(${signals ? sql.json(signals) : null}, signals)
    WHERE hostname = ${hostname} AND check_id = ${checkId}
  `;
  // Invalidate 20-min cache for this hostname (К5)
  await invalidateCacheForHostname(hostname);
}

export async function disputeDomainException(hostname, checkId) {
  if (!enabled) return;
  await sql`
    UPDATE domain_exceptions SET status = 'disputed'
    WHERE hostname = ${hostname} AND check_id = ${checkId}
  `;
}

export async function incrementVerifyRetry(hostname, checkId) {
  if (!enabled) return 0;
  const rows = await sql`
    UPDATE domain_exceptions SET
      verify_retries = verify_retries + 1,
      status = CASE WHEN verify_retries + 1 >= 3 THEN 'disputed' ELSE 'pending' END
    WHERE hostname = ${hostname} AND check_id = ${checkId}
    RETURNING verify_retries, status
  `;
  return rows[0] || null;
}

// Called on 'confirm' verdict when an active exception exists
export async function handleConfirmFeedback(hostname, checkId) {
  if (!enabled) return;
  const rows = await sql`
    UPDATE domain_exceptions SET
      confirm_count = confirm_count + 1,
      status = CASE WHEN confirm_count + 1 >= 2 THEN 'disputed' ELSE status END
    WHERE hostname = ${hostname} AND check_id = ${checkId} AND status = 'active'
    RETURNING confirm_count, status
  `;
  return rows[0] || null;
}

export async function getActiveDomainExceptions(hostname) {
  if (!enabled) return [];
  return sql`
    SELECT check_id, override_status, false_positive_count, reason
    FROM domain_exceptions
    WHERE hostname = ${hostname}
      AND status   = 'active'
      AND last_feedback > NOW() - INTERVAL '30 days'
  `;
}

export async function getDomainExceptionStatus(hostname, checkId) {
  if (!enabled) return null;
  const rows = await sql`
    SELECT status, false_positive_count, verify_retries
    FROM domain_exceptions WHERE hostname = ${hostname} AND check_id = ${checkId}
  `;
  return rows[0] || null;
}

export async function getAllExceptions() {
  if (!enabled) return [];
  return sql`
    SELECT hostname, check_id, override_status, status,
           false_positive_count, confirm_count, verify_retries,
           verified_at, last_feedback, reason, signals
    FROM domain_exceptions
    ORDER BY last_feedback DESC
  `;
}

export async function expireExceptionsByCheckId(checkId) {
  if (!enabled) return 0;
  const result = await sql`
    UPDATE domain_exceptions SET status = 'expired'
    WHERE check_id = ${checkId} AND status = 'active'
  `;
  return result.count;
}

// Invalidate 20-min cache for a hostname so next scan picks up new exceptions (К5)
async function invalidateCacheForHostname(hostname) {
  if (!enabled) return;
  await sql`
    DELETE FROM scans
    WHERE hostname   = ${hostname}
      AND created_at > NOW() - INTERVAL '20 minutes'
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

export async function getRecentLeads(limit = 5) {
  if (!enabled) return [];
  return sql`
    SELECT id, email, company, scan_uuid, created_at
    FROM leads
    ORDER BY created_at DESC
    LIMIT ${Math.min(limit, 20)}
  `;
}

export async function getLeadStats() {
  if (!enabled) return null;
  const rows = await sql`
    SELECT
      COUNT(*)::int                                                               AS total,
      COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '7 days')::int        AS last_7_days,
      COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '24 hours')::int      AS last_24h
    FROM leads
  `;
  return rows[0] || null;
}

// ── Monitoring Subscriptions ─────────────────────────────────────────────────

export async function saveSubscription(email, hostname, scanUuid = null) {
  if (!enabled) return;
  await sql`
    INSERT INTO monitoring_subscriptions (email, hostname, scan_uuid)
    VALUES (${email}, ${hostname}, ${scanUuid})
    ON CONFLICT (email, hostname) DO UPDATE SET
      active       = true,
      scan_uuid    = COALESCE(${scanUuid}, monitoring_subscriptions.scan_uuid),
      created_at   = NOW()
  `;
}

export async function getActiveSubscriptions() {
  if (!enabled) return [];
  return sql`
    SELECT id, email, hostname, scan_uuid, created_at, last_scan_at
    FROM monitoring_subscriptions
    WHERE active = true
    ORDER BY created_at DESC
  `;
}

export async function deactivateSubscription(email, hostname) {
  if (!enabled) return;
  await sql`
    UPDATE monitoring_subscriptions SET active = false
    WHERE email = ${email} AND hostname = ${hostname}
  `;
}

export async function getScanStats() {
  if (!enabled) return null;
  const rows = await sql`
    SELECT
      COUNT(*)::int                                                               AS total,
      COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '7 days')::int        AS last_7_days,
      COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '24 hours')::int      AS last_24h,
      MAX(created_at)                                                             AS last_scan_at
    FROM scans
  `;
  return rows[0] || null;
}

// ── Funnel events ─────────────────────────────────────────────────────────────

// Records a single funnel step (scan_done, doc_offer_shown, doc_offer_clicked,
// intake_opened, intake_submitted). Fire-and-forget — never throws to the caller.
export async function saveEvent({ type, scanUuid = null, hostname = null, utm = null }) {
  if (!enabled || !type) return;
  try {
    await sql`
      INSERT INTO events (type, scan_uuid, hostname, utm)
      VALUES (${type}, ${scanUuid}, ${hostname}, ${utm ? sql.json(utm) : null})
    `;
  } catch (err) {
    console.warn('[db] saveEvent failed:', err.message);
  }
}

// Funnel counts per event type over the last N days, plus a UTM-source breakdown.
export async function getFunnel(days = 30) {
  if (!enabled) return null;
  const byType = await sql`
    SELECT type, COUNT(*)::int AS count
    FROM events
    WHERE created_at > NOW() - MAKE_INTERVAL(days => ${days})
    GROUP BY type
    ORDER BY count DESC
  `;
  const bySource = await sql`
    SELECT COALESCE(utm->>'utm_source', 'direct') AS source,
           COUNT(*) FILTER (WHERE type = 'scan_done')::int        AS scans,
           COUNT(*) FILTER (WHERE type = 'doc_offer_clicked')::int AS clicks,
           COUNT(*) FILTER (WHERE type = 'intake_submitted')::int  AS submits
    FROM events
    WHERE created_at > NOW() - MAKE_INTERVAL(days => ${days})
    GROUP BY source
    ORDER BY scans DESC
  `;
  return { byType, bySource, days };
}

export { enabled as dbEnabled };
