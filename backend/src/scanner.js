/**
 * Web-side scan orchestration — replaces runSinglePageScan / runFullSiteScan
 * from the Tampermonkey script.
 *
 * Key difference from the Tampermonkey version:
 * - No DOM access — uses buildPageContext() (Playwright) instead of getCurrentPageContent()
 * - No UI updates — returns plain JSON instead of rendering HTML
 * - No GM_* calls — all handled by engine.js wiring
 */
import { createEngine } from './engine.js';
import { buildPageContext } from './pageContext.js';

/**
 * Scan a single page and return compliance results.
 *
 * @param {{ url: string, groqKey: string, slezaKey: string, useAI?: boolean }} opts
 * @returns {Promise<object>} JSON results matching the shape renderResults() expects
 */
export async function scanSinglePage({ url, groqKey, slezaKey, useAI = true }) {
  const engine = createEngine({ groqKey, slezaKey });

  // 1. Get page content via Playwright (rendered DOM, same as Tampermonkey in browser)
  const pageContext = await buildPageContext(url);
  const fullText = `${pageContext.title}\n${pageContext.header}\n${pageContext.bodyText}\n${pageContext.footer}`;

  // 2. Check against the Sleza foreign-agents / extremists registry
  const slezaResult = await engine.checkWithSleza(fullText);
  const items = (slezaResult.items || []).map(engine.parseSlezaItem);
  const checked = items.map(item => ({
    ...item,
    ...engine.checkMarkingNearby(fullText, item.name, item.category),
    pageUrl: url,
  }));

  // 3. EGRUL verification — look for INN/OGRN in page text, check against FNS registry
  const ids = engine.extractIdentifiers(fullText);
  let egrulResult = null;
  if (ids.ogrn || ids.inn) {
    egrulResult = await engine.checkEgrul(ids.ogrn || ids.inn);
  }
  const egrul = { checked: true, ids, result: egrulResult };

  // 4. AI analysis (152-FZ, ERIR, offer, drugs, cookie) — or local-only if useAI=false
  let aiData;
  if (useAI && groqKey) {
    aiData = await engine.runAIAnalysis(pageContext, egrul, fullText);
  } else {
    // Local checks only — no Groq call, no cost
    const result152  = engine.check152FZ(pageContext.bodyText + ' ' + pageContext.header + ' ' + pageContext.footer);
    const result149  = engine.check149FZ(fullText);
    const resultERIR = engine.checkERIR(fullText);
    const resultOffer = engine.checkOffer(fullText, pageContext.offerLinks);
    const resultDrugs = engine.checkDrugs(fullText);
    const resultCookie = engine.checkCookieCompliance({
      hasTracking: pageContext.hasAdScripts,
      hasCookieBanner: pageContext.hasCookieBanner,
      policyHasCookies: false,
    });
    aiData = {
      checks: engine.buildLocalChecks({ result152, result149, resultERIR, resultOffer, resultDrugs, resultCookie, egrul }),
      site_name: pageContext.title,
    };
  }

  return {
    mode: 'single',
    url,
    hostname: (() => { try { return new URL(url).hostname; } catch { return url; } })(),
    pages: [{ url, title: pageContext.title, items: checked, isCurrent: true }],
    aiData,
    egrul,
    slezaError: slezaResult.errors || null,
  };
}

/**
 * Scan an entire site (sitemap or crawl) and return compliance results.
 * Full-site logic mirrors runFullSiteScan() from the Tampermonkey script.
 */
export async function scanFullSite({ url, groqKey, slezaKey, useAI = true, onProgress }) {
  const engine = createEngine({ groqKey, slezaKey });
  const origin = (() => { try { return new URL(url).origin; } catch { return url; } })();

  onProgress?.({ phase: 'sitemap', url: origin });

  // 1. Discover URLs via sitemap or crawl
  let urlList = await engine.trySitemap(origin);
  if (!urlList || urlList.urls.length === 0) {
    onProgress?.({ phase: 'crawl', url: origin });
    urlList = await engine.crawlSite(url, 200, 2, p => onProgress?.({ phase: 'crawl', ...p }));
  }

  const urls = urlList.urls;
  let scoredList = urls
    .map(u => ({ url: u, score: engine.scoreUrl(u) }))
    .filter(x => x.score >= 0)
    .sort((a, b) => b.score - a.score);

  // Fallback: scoreUrl rejected >95% of URLs — non-standard site structure.
  // Use all URLs with LOW priority so at least something gets scanned.
  if (scoredList.length === 0 && urls.length > 0) {
    scoredList = urls.map(u => ({ url: u, score: 3 }));
  }

  const scored = scoredList.slice(0, 50).map(x => x.url);

  // Ensure current page is first
  const finalUrls = [url, ...scored.filter(u => u !== url)].slice(0, 50);

  const pages = [];
  let allPagesRawText = '';
  let firstSlezaError = null;
  let totalFound = 0;

  // 2. Get main page via Playwright (for AI context and links)
  onProgress?.({ phase: 'render', url });
  const mainPageContext = await buildPageContext(url);

  // 3. Scan each page via Sleza API (plain fetch is fine for text extraction here)
  for (let i = 0; i < finalUrls.length; i++) {
    const pageUrl = finalUrls[i];
    onProgress?.({ phase: 'sleza', current: i + 1, total: finalUrls.length, url: pageUrl });

    const pageData = await engine.fetchUrl(pageUrl);
    if (!pageData.ok) {
      pages.push({ url: pageUrl, title: pageUrl, items: [], error: 'не загружено' });
      continue;
    }

    allPagesRawText += ' ' + pageData.text.slice(-1500);

    if (!engine.hasNameLikePatterns(pageData.text)) {
      pages.push({ url: pageUrl, title: pageData.title, items: [], skipped: true });
      continue;
    }

    const slezaResult = await engine.checkWithSleza(pageData.text);
    if (slezaResult.errors && !firstSlezaError) firstSlezaError = slezaResult.errors;
    const items = (slezaResult.items || []).map(engine.parseSlezaItem);
    const checked = items.map(item => ({
      ...item,
      ...engine.checkMarkingNearby(pageData.text, item.name, item.category),
      pageUrl,
    }));
    totalFound += checked.length;
    pages.push({ url: pageUrl, title: pageData.title, items: checked });

    if (i < finalUrls.length - 1) {
      await new Promise(r => setTimeout(r, 1100)); // Sleza rate limit: 1 req/sec
    }
  }

  // 4. EGRUL — combine all page tails + main page DOM text
  const allPagesText = allPagesRawText + ' ' + mainPageContext.bodyText + ' ' + mainPageContext.footer;
  const ids = engine.extractIdentifiers(allPagesText);
  let egrulResult = null;
  if (ids.ogrn || ids.inn) {
    egrulResult = await engine.checkEgrul(ids.ogrn || ids.inn);
  }
  const egrul = { checked: true, ids, result: egrulResult };

  // 5. AI analysis on main page context
  onProgress?.({ phase: 'ai', url });
  let aiData;
  if (useAI && groqKey) {
    aiData = await engine.runAIAnalysis(mainPageContext, egrul, allPagesText);
  } else {
    const result152  = engine.check152FZ(mainPageContext.bodyText + ' ' + mainPageContext.header);
    const result149  = engine.check149FZ(allPagesText);
    const resultERIR = engine.checkERIR(allPagesText);
    const resultOffer = engine.checkOffer(allPagesText, mainPageContext.offerLinks);
    const resultDrugs = engine.checkDrugs(allPagesText);
    const resultCookie = engine.checkCookieCompliance({
      hasTracking: mainPageContext.hasAdScripts,
      hasCookieBanner: mainPageContext.hasCookieBanner,
      policyHasCookies: false,
    });
    aiData = {
      checks: engine.buildLocalChecks({ result152, result149, resultERIR, resultOffer, resultDrugs, resultCookie, egrul }),
      site_name: mainPageContext.title,
    };
  }

  return {
    mode: 'full',
    url,
    hostname: (() => { try { return new URL(url).hostname; } catch { return url; } })(),
    source: urlList.source,
    pages,
    aiData,
    egrul,
    slezaError: firstSlezaError,
    stats: { total: urls.length, scanned: pages.length, found: totalFound },
  };
}
