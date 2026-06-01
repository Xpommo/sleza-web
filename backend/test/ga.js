/**
 * Unit test for checkGoogleAnalytics — policy-aware GA verdict.
 * Run: node test/ga.js   (from backend/)
 */
import assert from 'node:assert/strict';
import { checkGoogleAnalytics } from '../src/scanner.js';

let passed = 0;
function test(name, fn) {
  try { fn(); passed++; console.log(`  ✓ ${name}`); }
  catch (e) { console.error(`  ✗ ${name}\n    ${e.message}`); process.exitCode = 1; }
}

console.log('checkGoogleAnalytics:');

test('no GA → ok', () => {
  const r = checkGoogleAnalytics({ hasGoogleAnalytics: false }, '');
  assert.equal(r.status, 'ok');
  assert.equal(r.fine, '0 руб.');
});

test('GA + policy silent → violation', () => {
  const r = checkGoogleAnalytics({ hasGoogleAnalytics: true }, 'Мы обрабатываем ваши данные для исполнения договора.');
  assert.equal(r.status, 'violation');
  assert.equal(r.fine, '300 000 руб.');
});

test('GA + policy mentions трансграничную передачу → risk', () => {
  const r = checkGoogleAnalytics({ hasGoogleAnalytics: true }, 'Осуществляется трансграничная передача персональных данных.');
  assert.equal(r.status, 'risk');
  assert.equal(r.fine, '');
});

test('GA + policy mentions Google → risk (amoCRM case)', () => {
  const r = checkGoogleAnalytics({ hasGoogleAnalytics: true }, 'Использование данных регулируется политикой Google.');
  assert.equal(r.status, 'risk');
});

test('GA + policy mentions "за пределы территории РФ" → risk', () => {
  const r = checkGoogleAnalytics({ hasGoogleAnalytics: true }, 'Данные могут передаваться за пределы территории РФ.');
  assert.equal(r.status, 'risk');
});

console.log(`\n${passed} passed`);
