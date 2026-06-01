/**
 * Unit test for buildIntakePrefill — the scan→intake mapping (Sprint A2).
 * Run: node test/intake.js   (from backend/)
 */
import assert from 'node:assert/strict';
import { buildIntakePrefill, ASK_FIELDS } from '../../frontend/lib/intakePrefill.js';

let passed = 0;
function test(name, fn) {
  try { fn(); passed++; console.log(`  ✓ ${name}`); }
  catch (e) { console.error(`  ✗ ${name}\n    ${e.message}`); process.exitCode = 1; }
}

console.log('buildIntakePrefill:');

// 1. Shop with GA + tracking, no cookie banner, no policy — the classic violation case.
test('shop: GA/analytics on, no banner, no policy → known reflects signals', () => {
  const data = {
    intakeSignals: {
      usesGoogleAnalytics: true, usesAnalytics: true, usesAds: false,
      hasCookieBanner: false, hasConsentCheckbox: false, hasPreCheckedConsent: false,
      hasPolicyLink: false, operatorName: 'ООО Ромашка', inn: '7700000000', ogrn: '1027700000000',
    },
    aiData: { checks: [{ id: 'ga', status: 'violation' }, { id: 'law152', status: 'violation' }] },
    egrul: { ids: { inn: '7700000000', ogrn: '1027700000000' }, result: { parsed: { name: 'ООО Ромашка' } } },
  };
  const r = buildIntakePrefill(data);
  assert.equal(r.operator.name, 'ООО Ромашка');
  assert.equal(r.operator.inn, '7700000000');
  assert.equal(r.known.find(k => k.id === 'uses_ga').value, true);
  assert.equal(r.known.find(k => k.id === 'cookie_banner').value, false);
  assert.equal(r.known.find(k => k.id === 'has_policy').value, false);
  assert.equal(r.ask.length, ASK_FIELDS.length);
  // operator resolved → counted as known
  assert.equal(r.counts.known, r.known.length + 1);
});

// 2. Pre-checked consent surfaces as an extra known row with a violation note.
test('pre-checked consent → extra known row flagged', () => {
  const data = {
    intakeSignals: {
      usesGoogleAnalytics: false, usesAnalytics: true, usesAds: false,
      hasCookieBanner: true, hasPreCheckedConsent: true, hasPolicyLink: true,
      operatorName: null, inn: null, ogrn: null,
    },
    aiData: { checks: [] },
  };
  const r = buildIntakePrefill(data);
  const pc = r.known.find(k => k.id === 'pre_checked');
  assert.ok(pc, 'pre_checked row present');
  assert.match(pc.note, /ст\.9/);
  // no operator resolved → not counted
  assert.equal(r.counts.known, r.known.length);
});

// 3. Clean SaaS: tracking with banner + policy present.
test('clean saas: banner + policy → values true, no pre_checked row', () => {
  const data = {
    intakeSignals: {
      usesGoogleAnalytics: false, usesAnalytics: true, usesAds: false,
      hasCookieBanner: true, hasPreCheckedConsent: false, hasPolicyLink: true,
      operatorName: 'ООО СаасКо', inn: '7800000000', ogrn: null,
    },
    aiData: { checks: [] },
  };
  const r = buildIntakePrefill(data);
  assert.equal(r.known.find(k => k.id === 'has_policy').value, true);
  assert.equal(r.known.find(k => k.id === 'cookie_banner').value, true);
  assert.equal(r.known.find(k => k.id === 'pre_checked'), undefined);
});

// 4. Graceful fallback: old scan with NO intakeSignals — derive coarsely from checks, never throw.
test('no intakeSignals → derives from checks, no crash', () => {
  const data = {
    aiData: { checks: [{ id: 'ga', status: 'violation' }, { id: 'law152', status: 'risk' }, { id: 'erir', status: 'violation' }] },
    egrul: { ids: { inn: null, ogrn: null }, result: { parsed: null } },
  };
  const r = buildIntakePrefill(data);
  assert.equal(r.known.find(k => k.id === 'uses_ga').value, true);   // ga check != ok
  assert.equal(r.known.find(k => k.id === 'uses_ads').value, true);  // erir check != ok
  assert.equal(r.known.find(k => k.id === 'has_policy').value, true); // law152 risk → has-ish
  assert.equal(r.operator.name, null);
  assert.equal(r.counts.known, r.known.length); // no operator
});

// 4b. Policy found via deep fallback: page has no policy link, but law152 verdict is ok.
test('no policy link but law152 ok → has_policy true', () => {
  const data = {
    intakeSignals: {
      usesGoogleAnalytics: false, usesAnalytics: true, usesAds: false,
      hasCookieBanner: false, hasPreCheckedConsent: false, hasPolicyLink: false,
      operatorName: null, inn: null, ogrn: null,
    },
    aiData: { checks: [{ id: 'law152', status: 'ok' }] },
  };
  const r = buildIntakePrefill(data);
  assert.equal(r.known.find(k => k.id === 'has_policy').value, true);
});

// 5. Empty / malformed input must not throw.
test('empty data → safe defaults', () => {
  const r = buildIntakePrefill({});
  assert.equal(r.known.length, 5);
  assert.equal(r.ask.length, ASK_FIELDS.length);
  assert.equal(r.operator.name, null);
});

console.log(`\n${passed} passed`);
