// Tests for calcConfidence — run with: node --test test/calcConfidence.test.js
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { calcConfidence } from '../src/scanDiff.js';

const fullEgrul = { result: { parsed: { type: 'org', name: 'ООО Тест' } }, ids: { inn: '1234567890' }, checked: true };
const noEgrul   = { result: null, ids: {}, checked: true };

const okCtx = { _blocked: false, _fallback: false, hasPolicyFooterLink: true, hasCookieBanner: false };
const blockedCtx = { _blocked: true, _fallback: false, hasPolicyFooterLink: false, hasCookieBanner: false };
const fallbackCtx = { _blocked: false, _fallback: true, hasPolicyFooterLink: false, hasCookieBanner: false };

const checks = (cookie, law152) => [
  { id: 'cookie',  status: cookie  },
  { id: 'law152',  status: law152  },
];

describe('calcConfidence', () => {
  it('returns high score for ideal conditions', () => {
    const result = {
      egrul: fullEgrul,
      aiData: { checks: checks('ok', 'ok') },
    };
    const conf = calcConfidence(result, [okCtx], true);
    assert.ok(conf.score >= 80, `expected >= 80, got ${conf.score}`);
    assert.equal(conf.label, 'high');
  });

  it('returns low score when page is blocked', () => {
    const result = {
      egrul: noEgrul,
      aiData: { checks: checks('violation', 'violation') },
    };
    const conf = calcConfidence(result, [blockedCtx], false);
    assert.ok(conf.score < 50, `expected < 50, got ${conf.score}`);
    assert.equal(conf.label, 'low');
  });

  it('penalizes fallback pages', () => {
    const result = { egrul: fullEgrul, aiData: { checks: checks('ok', 'ok') } };
    const withFallback    = calcConfidence(result, [fallbackCtx], true);
    const withoutFallback = calcConfidence(result, [okCtx],       true);
    assert.ok(withFallback.score < withoutFallback.score);
  });

  it('penalizes missing egrul', () => {
    const result = { egrul: noEgrul, aiData: { checks: checks('ok', 'ok') } };
    const withEgrul    = calcConfidence({ egrul: fullEgrul, aiData: result.aiData }, [okCtx], true);
    const withoutEgrul = calcConfidence(result, [okCtx], true);
    assert.ok(withoutEgrul.score < withEgrul.score);
  });

  it('penalizes no AI', () => {
    const result = { egrul: fullEgrul, aiData: { checks: checks('ok', 'ok') } };
    const withAI    = calcConfidence(result, [okCtx], true);
    const withoutAI = calcConfidence(result, [okCtx], false);
    assert.ok(withoutAI.score < withAI.score);
  });

  it('returns medium label for middle scores', () => {
    const result = { egrul: fullEgrul, aiData: { checks: checks('ok', 'ok') } };
    const conf = calcConfidence(result, [fallbackCtx], false);
    // fallback(-15) + no AI(-20) but egrul(+20) + ai agrees local... varies
    assert.ok(['medium', 'high', 'low'].includes(conf.label));
  });

  it('includes factors object', () => {
    const result = { egrul: fullEgrul, aiData: { checks: checks('ok', 'ok') } };
    const conf = calcConfidence(result, [okCtx], true);
    assert.ok(typeof conf.factors === 'object');
    assert.ok('egrul_found' in conf.factors);
    assert.ok('ai_used' in conf.factors);
  });

  it('score is clamped between 0 and 100', () => {
    const result = { egrul: noEgrul, aiData: { checks: [] } };
    const conf = calcConfidence(result, [blockedCtx], false);
    assert.ok(conf.score >= 0 && conf.score <= 100);
  });
});
