// Tests for computeScanDiff — run with: node --test test/computeScanDiff.test.js
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { computeScanDiff } from '../src/scanDiff.js';

const makeResult = (checks) => ({
  scannedAt: '2026-05-20T10:00:00Z',
  aiData: { checks },
});

describe('computeScanDiff', () => {
  it('returns null when previous result is null', () => {
    const curr = makeResult([{ id: 'law152', status: 'ok' }]);
    assert.equal(computeScanDiff(null, curr), null);
  });

  it('marks unchanged check correctly', () => {
    const prev = makeResult([{ id: 'law152', status: 'ok' }]);
    const curr = makeResult([{ id: 'law152', status: 'ok' }]);
    const diff = computeScanDiff(prev, curr);
    assert.equal(diff.checks[0].direction, 'unchanged');
    assert.equal(diff.checks[0].prev, 'ok');
    assert.equal(diff.checks[0].curr, 'ok');
  });

  it('marks improved check (violation → ok)', () => {
    const prev = makeResult([{ id: 'erir', status: 'violation' }]);
    const curr = makeResult([{ id: 'erir', status: 'ok' }]);
    const diff = computeScanDiff(prev, curr);
    assert.equal(diff.checks[0].direction, 'improved');
    assert.deepEqual(diff.resolved, ['erir']);
    assert.deepEqual(diff.newViolations, []);
  });

  it('marks improved check (risk → ok)', () => {
    const prev = makeResult([{ id: 'cookie', status: 'risk' }]);
    const curr = makeResult([{ id: 'cookie', status: 'ok' }]);
    const diff = computeScanDiff(prev, curr);
    assert.equal(diff.checks[0].direction, 'improved');
  });

  it('marks regressed check (ok → violation)', () => {
    const prev = makeResult([{ id: 'law149', status: 'ok' }]);
    const curr = makeResult([{ id: 'law149', status: 'violation' }]);
    const diff = computeScanDiff(prev, curr);
    assert.equal(diff.checks[0].direction, 'regressed');
    assert.deepEqual(diff.newViolations, ['law149']);
    assert.deepEqual(diff.resolved, []);
  });

  it('marks regressed check (ok → risk)', () => {
    const prev = makeResult([{ id: 'offer', status: 'ok' }]);
    const curr = makeResult([{ id: 'offer', status: 'risk' }]);
    const diff = computeScanDiff(prev, curr);
    assert.equal(diff.checks[0].direction, 'regressed');
  });

  it('handles multiple checks with mixed directions', () => {
    const prev = makeResult([
      { id: 'law152', status: 'violation' },
      { id: 'erir',   status: 'ok'        },
      { id: 'cookie', status: 'risk'      },
    ]);
    const curr = makeResult([
      { id: 'law152', status: 'ok'        },
      { id: 'erir',   status: 'violation' },
      { id: 'cookie', status: 'risk'      },
    ]);
    const diff = computeScanDiff(prev, curr);
    const byId = Object.fromEntries(diff.checks.map(c => [c.id, c]));
    assert.equal(byId.law152.direction, 'improved');
    assert.equal(byId.erir.direction,   'regressed');
    assert.equal(byId.cookie.direction, 'unchanged');
    assert.deepEqual(diff.resolved,      ['law152']);
    assert.deepEqual(diff.newViolations, ['erir']);
  });

  it('carries scannedAt from previous result', () => {
    const prev = makeResult([{ id: 'law152', status: 'ok' }]);
    const curr = makeResult([{ id: 'law152', status: 'ok' }]);
    const diff = computeScanDiff(prev, curr);
    assert.equal(diff.scannedAt, prev.scannedAt);
  });

  it('handles check present only in current (new check added)', () => {
    const prev = makeResult([{ id: 'law152', status: 'ok' }]);
    const curr = makeResult([{ id: 'law152', status: 'ok' }, { id: 'drugs', status: 'violation' }]);
    const diff = computeScanDiff(prev, curr);
    const drugsDiff = diff.checks.find(c => c.id === 'drugs');
    assert.ok(drugsDiff);
    assert.equal(drugsDiff.direction, 'regressed');
  });
});
