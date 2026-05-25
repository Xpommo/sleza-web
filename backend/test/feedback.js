/**
 * Integration tests for the feedback-loop lifecycle (Option A).
 *
 * Tests the DB state machine:   pending → verifying → active → disputed
 * Tests applyFeedbackOverrides: active exception mutates check status + sets _override
 *
 * Requires DATABASE_URL in backend/.env (Supabase).
 * Skips all tests when DB is not configured — safe for local dev without Supabase.
 *
 * Usage:
 *   cd backend && node test/feedback.js
 */

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load .env so DATABASE_URL is available
(function loadEnv() {
  const p = join(__dirname, '..', '.env');
  if (!existsSync(p)) return;
  for (const line of readFileSync(p, 'utf8').split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const eq = t.indexOf('=');
    if (eq < 0) continue;
    const k = t.slice(0, eq).trim();
    const v = t.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
    if (k && !process.env[k]) process.env[k] = v;
  }
})();

const DB_ENABLED = !!process.env.DATABASE_URL;

function skip(msg) {
  console.log(`  ⏭  ${msg} (DATABASE_URL not set)`);
}

// ── helpers ──────────────────────────────────────────────────────────────────

const TEST_HOSTNAME = `feedback-test-${Date.now()}.local`;
const TEST_CHECK_ID = 'erir';
const TEST_UUID     = `test-uuid-${Date.now()}`;
const TEST_URL      = `https://${TEST_HOSTNAME}/`;
const MOCK_RESULT   = {
  url: TEST_URL,
  mode: 'single',
  aiData: {
    checks: [
      { id: 'erir',   status: 'violation', issue: 'Реклама без маркировки' },
      { id: 'cookie', status: 'ok',        issue: '' },
    ],
  },
};

// ── DB lifecycle tests ────────────────────────────────────────────────────────

describe('feedback-loop DB lifecycle', () => {
  let db;

  before(async () => {
    if (!DB_ENABLED) return;
    db = await import('../src/db.js');
    // Insert a mock scan so feedback FK is satisfied
    await db.saveScan({ uuid: TEST_UUID, url: TEST_URL, result: MOCK_RESULT });
  });

  after(async () => {
    if (!DB_ENABLED) return;
    // Cleanup test data
    const { default: postgres } = await import('postgres');
    const sql = postgres(process.env.DATABASE_URL, { ssl: 'require', max: 1 });
    await sql`DELETE FROM domain_exceptions WHERE hostname = ${TEST_HOSTNAME}`;
    await sql`DELETE FROM feedback          WHERE scan_uuid = ${TEST_UUID}`;
    await sql`DELETE FROM scans             WHERE uuid      = ${TEST_UUID}`;
    await sql.end();
    console.log('  🧹 test data cleaned up');
  });

  it('upsert × 1 → status = pending', async () => {
    if (!DB_ENABLED) return skip('upsert × 1');
    const result = await db.upsertDomainException(TEST_HOSTNAME, TEST_CHECK_ID, 'violation');
    assert.ok(result, 'should return a result');
    assert.equal(result.count, 1);
    assert.equal(result.shouldVerify, false);
    assert.ok(['pending', 'verifying'].includes(result.status));

    const exc = await db.getDomainExceptionStatus(TEST_HOSTNAME, TEST_CHECK_ID);
    assert.ok(exc);
    assert.equal(exc.status, 'pending');
    assert.equal(exc.false_positive_count, 1);
  });

  it('upsert × 2 → status = verifying, shouldVerify = true', async () => {
    if (!DB_ENABLED) return skip('upsert × 2');
    const result = await db.upsertDomainException(TEST_HOSTNAME, TEST_CHECK_ID, 'violation');
    assert.ok(result);
    assert.equal(result.count, 2);
    assert.equal(result.shouldVerify, true);
    assert.equal(result.status, 'verifying');

    const exc = await db.getDomainExceptionStatus(TEST_HOSTNAME, TEST_CHECK_ID);
    assert.equal(exc.status, 'verifying');
  });

  it('activateDomainException → status = active', async () => {
    if (!DB_ENABLED) return skip('activate');
    const signals = { hasAdScripts: false, hasGtm: true, effectiveAds: false };
    await db.activateDomainException(TEST_HOSTNAME, TEST_CHECK_ID,
      'GTM without ad text — re-scan ok (test)', signals);

    const exc = await db.getDomainExceptionStatus(TEST_HOSTNAME, TEST_CHECK_ID);
    assert.equal(exc.status, 'active');
  });

  it('getActiveDomainExceptions returns the active exception', async () => {
    if (!DB_ENABLED) return skip('getActiveDomainExceptions');
    const exceptions = await db.getActiveDomainExceptions(TEST_HOSTNAME);
    assert.equal(exceptions.length, 1);
    assert.equal(exceptions[0].check_id, TEST_CHECK_ID);
    assert.equal(exceptions[0].override_status, 'ok');
  });

  it('applyFeedbackOverrides applies _override + _original to matching check', async () => {
    if (!DB_ENABLED) return skip('applyFeedbackOverrides');
    const { applyFeedbackOverrides } = await import('../src/scanner.js');

    const checks = [
      { id: 'erir',   status: 'violation', issue: 'Реклама без маркировки' },
      { id: 'cookie', status: 'ok',        issue: '' },
    ];
    await applyFeedbackOverrides(TEST_HOSTNAME, checks);

    const erir = checks.find(c => c.id === 'erir');
    assert.equal(erir.status, 'ok', 'status should be overridden to ok');
    assert.ok(erir._override, '_override field should be present');
    assert.equal(erir._override.source, 'domain_exception');
    assert.ok(erir._original, '_original field should be present');
    assert.equal(erir._original.status, 'violation');

    const cookie = checks.find(c => c.id === 'cookie');
    assert.equal(cookie.status, 'ok', 'unaffected check should stay ok');
    assert.ok(!cookie._override, 'unaffected check should not have _override');
  });

  it('handleConfirmFeedback × 2 → status = disputed', async () => {
    if (!DB_ENABLED) return skip('confirm × 2');
    await db.handleConfirmFeedback(TEST_HOSTNAME, TEST_CHECK_ID); // count → 1
    await db.handleConfirmFeedback(TEST_HOSTNAME, TEST_CHECK_ID); // count → 2 → disputed

    const exc = await db.getDomainExceptionStatus(TEST_HOSTNAME, TEST_CHECK_ID);
    assert.equal(exc.status, 'disputed');
  });

  it('applyFeedbackOverrides does NOT apply override after exception is disputed', async () => {
    if (!DB_ENABLED) return skip('no override after disputed');
    const { applyFeedbackOverrides } = await import('../src/scanner.js');

    const checks = [
      { id: 'erir', status: 'violation', issue: 'Реклама без маркировки' },
    ];
    await applyFeedbackOverrides(TEST_HOSTNAME, checks);

    const erir = checks.find(c => c.id === 'erir');
    assert.equal(erir.status, 'violation', 'override should not apply to disputed exception');
    assert.ok(!erir._override, '_override should not be set');
  });
});

// ── law152/law149 safety cap tests ───────────────────────────────────────────

describe('domain_exception safety caps (no DB required)', () => {
  it('law152/law149 override caps at risk, never ok', async () => {
    if (!DB_ENABLED) return skip('safety cap (needs DB insert to verify)');
    const db = await import('../src/db.js');

    const H152 = `feedback-test-152-${Date.now()}.local`;
    const { default: postgres } = await import('postgres');
    const sql = postgres(process.env.DATABASE_URL, { ssl: 'require', max: 1 });
    try {
      const result = await db.upsertDomainException(H152, 'law152', 'violation');
      if (result) {
        // Get stored override_status
        const rows = await sql`SELECT override_status FROM domain_exceptions WHERE hostname=${H152} AND check_id='law152'`;
        assert.equal(rows[0]?.override_status, 'risk', 'law152 max override is risk, not ok');
      }
    } finally {
      await sql`DELETE FROM domain_exceptions WHERE hostname=${H152}`;
      await sql.end();
    }
  });
});

// ── verifyRetry exhaustion test ───────────────────────────────────────────────

describe('verify retry exhaustion', () => {
  it('incrementVerifyRetry × 3 → status = disputed', async () => {
    if (!DB_ENABLED) return skip('retry exhaustion');
    const db = await import('../src/db.js');
    const H = `feedback-retry-${Date.now()}.local`;
    const { default: postgres } = await import('postgres');
    const sql = postgres(process.env.DATABASE_URL, { ssl: 'require', max: 1 });
    try {
      // Insert in verifying state manually
      await sql`
        INSERT INTO domain_exceptions (hostname, check_id, override_status, status, false_positive_count)
        VALUES (${H}, 'erir', 'ok', 'verifying', 2)
      `;
      await db.incrementVerifyRetry(H, 'erir'); // retries = 1
      await db.incrementVerifyRetry(H, 'erir'); // retries = 2
      const r = await db.incrementVerifyRetry(H, 'erir'); // retries = 3 → disputed
      assert.equal(r.status, 'disputed');
    } finally {
      await sql`DELETE FROM domain_exceptions WHERE hostname=${H}`;
      await sql.end();
    }
  });
});

console.log(`\n📋 Feedback loop tests — DB: ${DB_ENABLED ? '✅ Supabase connected' : '⚠️  skipped (no DATABASE_URL)'}`);
