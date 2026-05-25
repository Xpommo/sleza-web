// Pure utilities — no external deps, safe to import in tests without playwright/vm.

const SEVERITY = { unknown: -1, ok: 0, risk: 1, violation: 2, error: 3 };

/**
 * Compare two scan results and return a diff object.
 * Returns null if prevResult is null (first scan for this domain).
 */
export function computeScanDiff(prevResult, currResult) {
  if (!prevResult) return null;

  const prevChecks = prevResult.aiData?.checks ?? [];
  const currChecks = currResult.aiData?.checks ?? [];

  // Use _original.status if present (К6: override shouldn't look like a real improvement)
  const statusOf = c => c._original?.status ?? c.status;

  const prevMap = new Map(prevChecks.map(c => [c.id, statusOf(c)]));
  const currMap = new Map(currChecks.map(c => [c.id, statusOf(c)]));
  const overrideMap = new Map(currChecks.filter(c => c._override).map(c => [c.id, true]));

  const allIds = new Set([...prevMap.keys(), ...currMap.keys()]);
  const checks = [];
  const resolved = [];
  const newViolations = [];

  for (const id of allIds) {
    const prev = prevMap.get(id) ?? 'unknown';
    const curr = currMap.get(id) ?? 'unknown';
    const prevSev = SEVERITY[prev] ?? -1;
    const currSev = SEVERITY[curr] ?? -1;
    let direction = 'unchanged';
    if (currSev < prevSev) {
      direction = 'improved';
      resolved.push(id);
    } else if (currSev > prevSev) {
      direction = 'regressed';
      newViolations.push(id);
    }
    const entry = { id, prev, curr, direction };
    if (overrideMap.has(id)) entry.overridden = true;
    checks.push(entry);
  }

  return { scannedAt: prevResult.scannedAt, checks, resolved, newViolations };
}

// ── Confidence score ──────────────────────────────────────────────────────────

/**
 * Calculate a confidence score (0-100) for a scan result.
 * @param {object} result     - scan result (egrul, aiData)
 * @param {object[]} pageCtxs - array of pageContext objects from the scan
 * @param {boolean} aiUsed    - whether AI analysis was run
 * @returns {{ score: number, label: 'high'|'medium'|'low', factors: object }}
 */
export function calcConfidence(result, pageCtxs = [], aiUsed = false) {
  const factors = {};

  // +20 EGRUL found
  factors.egrul_found = !!(result.egrul?.result?.parsed);

  // +20 AI used and returned checks
  factors.ai_used = aiUsed && (result.aiData?.checks?.length ?? 0) > 0;

  // +20 no blocked pages
  factors.pages_not_blocked = !pageCtxs.some(c => c._blocked);

  // +15 no fallback pages
  factors.pages_not_fallback = !pageCtxs.some(c => c._fallback);

  // +10 policy accessible (footer link or cookie banner found)
  factors.policy_accessible = pageCtxs.some(c => c.hasPolicyFooterLink || c.hasCookieBanner);

  // +15 AI and local signals agree on cookie/law152
  // When AI is used: cookie ok ↔ hasCookieBanner true, law152 ok ↔ hasPolicyFooterLink true
  if (aiUsed && pageCtxs.length > 0) {
    const cookieCheck = result.aiData?.checks?.find(c => c.id === 'cookie');
    const law152Check = result.aiData?.checks?.find(c => c.id === 'law152');
    const hasBanner = pageCtxs.some(c => c.hasCookieBanner);
    const hasPolicy = pageCtxs.some(c => c.hasPolicyFooterLink);
    const cookieAgreement  = !cookieCheck || (cookieCheck.status === 'ok') === hasBanner;
    const law152Agreement  = !law152Check || (law152Check.status === 'ok') === hasPolicy;
    factors.ai_local_agreement = cookieAgreement && law152Agreement;
  } else {
    factors.ai_local_agreement = false;
  }

  const rawScore = Math.min(100, Math.max(0,
    (factors.egrul_found       ? 20 : 0) +
    (factors.ai_used           ? 20 : 0) +
    (factors.pages_not_blocked ? 20 : 0) +
    (factors.pages_not_fallback ? 15 : 0) +
    (factors.policy_accessible ? 10 : 0) +
    (factors.ai_local_agreement ? 15 : 0),
  ));

  // Normalize to the achievable maximum for this scan type so that a perfectly
  // compliant site doesn't get a misleading "low" label just because no API key was used.
  // Without AI:  max = 20(egrul) + 20(no-block) + 15(no-fallback) + 10(policy) = 65
  // With AI:     max = 65 + 20(ai) + 15(agreement)                             = 100
  const maxAchievable = aiUsed ? 100 : 65;
  const score = Math.round((rawScore / maxAchievable) * 100);

  const label = score >= 80 ? 'high' : score >= 50 ? 'medium' : 'low';

  return { score, label, factors, rawScore, maxAchievable };
}
