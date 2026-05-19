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

// Extract hrefs from raw HTML that look like personal-data policy pages (1-level follow).
// Handles sites like ixbt.com where rules:persdatapolicy is only linked from rules:cookie.
function extractPolicyHrefs(html, baseUrl) {
  const re = /href=["']([^"'#]+)["']/g;
  const kw = /конфиденц|персональн|persdatapol|privacy|personal.?data/i;
  const out = new Set();
  let m;
  while ((m = re.exec(html)) !== null) {
    if (!kw.test(m[1])) continue;
    try { out.add(new URL(m[1], baseUrl).href); } catch {}
  }
  return [...out];
}

async function fetchPolicyText(engine, pageContext, origin, fallback) {
  // Try all policyLinks then all offerLinks — sites may label policy as «Правила»
  // which lands in offerLinks; also some combine policy+agreement in one document.
  const candidates = [
    ...(pageContext.policyLinks || []).map(l => l.href),
    ...(pageContext.offerLinks  || []).map(l => l.href),
  ].filter((h, i, a) => h && a.indexOf(h) === i);

  let combined = '';
  const visited = new Set(candidates);

  for (const href of candidates) {
    const p = await engine.fetchUrl(href);
    if (!p.ok || p.text.length < 200) continue;
    combined += '\n' + htmlToText(p.text);
    // Follow 1 level: find personal-data policy links inside this page
    for (const sub of extractPolicyHrefs(p.text, href)) {
      if (visited.has(sub)) continue;
      visited.add(sub);
      const sp = await engine.fetchUrl(sub);
      if (sp.ok && sp.text.length > 200) combined += '\n' + htmlToText(sp.text);
    }
  }
  if (combined.length > 200) return combined;

  // Fallback: probe common URL patterns
  const policyPages = await engine.discoverPolicyByCommonPaths(origin);
  if (policyPages[0]?.text) return htmlToText(policyPages[0].text);
  return fallback;
}

// Fetch extra compliance pages (offer, about) for 149-FZ rekvizity check.
// These pages often don't make it into the top-scored crawl pages on large sites.
// Strip HTML tags and decode entities so check149FZ patterns (written for innerText) work correctly
function htmlToText(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&laquo;/g, '«').replace(/&raquo;/g, '»')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g,    (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/\s{2,}/g, ' ').trim();
}

// Fetch ALL offer + about + policy pages for 149-FZ rekvizity.
// aboutLinks[0] may not be the реквизиты page — try all available links.
async function fetchExtraText(engine, pageContext) {
  const hrefs = [
    ...(pageContext.offerLinks  || []).map(l => l.href),
    ...(pageContext.aboutLinks  || []).map(l => l.href),
    ...(pageContext.policyLinks || []).map(l => l.href),
  ].filter((h, i, a) => h && a.indexOf(h) === i);
  let extra = '';
  for (const href of hrefs) {
    const r = await engine.fetchUrl(href);
    if (r.ok) extra += '\n' + htmlToText(r.text);
  }
  return extra;
}

function applyMediaOverride(aiData, siteType) {
  if (siteType !== 'media' || !aiData?.checks) return;
  const offer = aiData.checks.find(c => c.id === 'offer');
  if (offer && offer.status !== 'ok') {
    offer.status = 'ok';
    offer.issue  = 'Информационный/медиа-сайт — публичная оферта не требуется (ЗоЗПП ст.26.1 применяется только к интернет-торговле)';
    offer.action = '—';
  }
  const drugs = aiData.checks.find(c => c.id === 'drugs');
  if (drugs && drugs.status === 'risk') {
    drugs.action = 'Добавить редакционный дисклеймер к материалу: «Редакция не пропагандирует употребление наркотиков. Материал носит информационный / новостной характер»';
  }
}

function applyServicesOverride(aiData, siteType) {
  if (siteType !== 'services' || !aiData?.checks) return;
  const offer = aiData.checks.find(c => c.id === 'offer');
  if (offer && offer.status !== 'ok' && offer.issue) {
    // "Return of goods" rules (ЗоЗПП ст.26.1) apply only to physical goods —
    // remove it from the issue for service/institutional sites
    offer.issue = offer.issue
      .replace(/условия?\s+возврата\s+товара[;,]?\s*/gi, '')
      .replace(/\(торговая\s+площадка\)/gi, '(платные услуги / договор оказания услуг)')
      .trim().replace(/^[;,\s]+/, '');
    if (offer.action) {
      offer.action = 'Опубликовать договор оказания услуг с реквизитами исполнителя (ИНН/ОГРН, полное название, адрес, email) и порядком расторжения';
    }
  }
}

/**
 * Auto-detect site type from page context when user left selector at 'auto'.
 * Returns 'media', 'ecommerce', 'services', 'saas', or 'auto' (= full checks).
 */
function detectSiteType(pageContext) {
  const titleHeader = `${pageContext.title || ''} ${pageContext.header || ''}`.toLowerCase();
  // Also check first 2000 chars of body for signals missed in title/header
  const body2k = (pageContext.bodyText || '').slice(0, 2000).toLowerCase();
  const text = titleHeader + ' ' + body2k;
  const allLinks = (pageContext.links || []).map(l => (l.href || '').toLowerCase());
  const hostname = (() => { try { return new URL(pageContext.url || '').hostname.toLowerCase(); } catch { return ''; } })();

  // Media/news signals — title/header contains journalistic keywords
  if (/новост|обзор|статьи|журнал|\bсми\b|медиа|редакци|публикац|пресс-релиз/.test(titleHeader))
    return 'media';

  // Services/corporate/edu signals — domain or text contains institutional keywords.
  // These sites may sell services but return-of-goods rules don't apply.
  const servicesDomainRe = /institut|clinic|hospital|academy|school|university|edu\.|\.edu|медцентр|клиник|больниц/;
  const servicesTextRe   = /институт|клиника|больниц|академия|университет|факультет|кафедр|АНО\b|НКО\b|ДПО\b|ЧОУ\b|ФГБУ|ФГБОУ|кабинет\s+врач|медицинск|стоматолог|поликлиник|образовательн|учебн[ыйое]+\s+центр|курсы\s+повышени|профессиональн[ао]+\s+переподготовк/;
  if (servicesDomainRe.test(hostname) || servicesTextRe.test(titleHeader)) return 'services';

  // E-commerce signals — cart/checkout links or shop keywords in title
  if (/магазин|интернет.магазин|купить|каталог товар/.test(titleHeader)) return 'ecommerce';
  if (allLinks.some(l => /\/(cart|basket|checkout|product|catalog)\b/.test(l))) return 'ecommerce';

  // SaaS signals — require at least 2 signals to avoid "новостная подписка" false positive
  const saasTextHits = [
    /\bтариф[ыа]?\b/.test(text),
    /\bподписк[аи]\b/.test(text) && !/новостная|email.подписк|рассылк/.test(text),
    /pricing|per.month/.test(text),
    /корпоративн[а-яё]+\s+(?:план|тариф|лицензи|решени)/.test(text),
    /\bплатформ[ауы]\b/.test(titleHeader),
  ].filter(Boolean).length;
  if (saasTextHits >= 2) return 'saas';
  if (allLinks.some(l => /\/(pricing|plans|tariff)\b/.test(l))) return 'saas';

  return 'auto';
}

/**
 * Scan a single page and return compliance results.
 *
 * @param {{ url: string, groqKey: string, slezaKey: string, useAI?: boolean, siteType?: string }} opts
 * @returns {Promise<object>} JSON results matching the shape renderResults() expects
 */
export async function scanSinglePage({ url, groqKey, slezaKey, useAI = true, siteType = 'auto' }) {
  const engine = await createEngine({ groqKey, slezaKey });
  const origin = (() => { try { return new URL(url).origin; } catch { return url; } })();

  // 1. Get page content via Playwright (rendered DOM, same as Tampermonkey in browser)
  const pageContext = await buildPageContext(url);
  if (siteType === 'auto') siteType = detectSiteType(pageContext);
  const fullText = `${pageContext.title}\n${pageContext.header}\n${pageContext.bodyText}\n${pageContext.footer}`;
  const fullTextWithMeta = fullText + '\n' + (pageContext.jsonLdText || '');

  // 2. Check against the Sleza foreign-agents / extremists registry
  const slezaResult = await engine.checkWithSleza(fullText);
  const items = (slezaResult.items || []).map(engine.parseSlezaItem);
  const checked = items.map(item => ({
    ...item,
    ...engine.checkMarkingNearby(fullText, item.name, item.category),
    pageUrl: url,
  }));

  // 3. EGRUL verification — include JSON-LD so ИНН/ОГРН in structured data is found
  const ids = engine.extractIdentifiers(fullTextWithMeta);
  let egrulResult = null;
  if (ids.ogrn || ids.inn) {
    egrulResult = await engine.checkEgrul(ids.ogrn || ids.inn);
  }
  const egrul = { checked: true, ids, result: egrulResult };

  // 4. AI analysis (152-FZ, ERIR, offer, drugs, cookie) — or local-only if useAI=false
  let aiData;
  if (useAI && groqKey) {
    aiData = await engine.runAIAnalysis(pageContext, egrul, fullText);
    applyMediaOverride(aiData, siteType);
    applyServicesOverride(aiData, siteType);
  } else {
    // Discover privacy policy page for accurate 152-FZ check
    // (homepage rarely has the full policy text)
    const policyText = await fetchPolicyText(engine, pageContext, origin, fullText);
    const result152  = engine.check152FZ(policyText + ' ' + pageContext.header);
    // Fetch offer + about pages — rekvizity (INN, address, phone) often live in user-agreement
    const extraText  = await fetchExtraText(engine, pageContext);
    const result149  = engine.check149FZ(fullText + extraText);
    const resultERIR = engine.checkERIR(fullText + '\n' + (pageContext.eridAttrs || ''));
    const resultOffer = engine.checkOffer(fullText, pageContext.offerLinks);
    const resultDrugs = engine.checkDrugs(fullText);
    const policyHasCookies = /cookie|куки|файл[ыа]\s+cookie/i.test(policyText);
    const resultCookie = engine.checkCookieCompliance({
      hasTracking: pageContext.hasAdScripts,
      hasCookieBanner: pageContext.hasCookieBanner,
      policyHasCookies,
    });
    aiData = {
      checks: engine.buildLocalChecks({ result152, result149, resultERIR, resultOffer, resultDrugs, resultCookie, egrul, siteType }),
      site_name: pageContext.title,
    };
  }

  return {
    mode: 'single',
    scannedAt: new Date().toISOString(),
    fallback: pageContext._fallback || false,
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
export async function scanFullSite({ url, groqKey, slezaKey = '', useAI = true, onProgress, siteType = 'auto' }) {
  const engine = await createEngine({ groqKey, slezaKey });
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
  if (scoredList.length === 0 && urls.length > 0) {
    scoredList = urls.map(u => ({ url: u, score: 3 }));
  }

  // Adaptive limit: without Sleza key there's no rate limit, so we can scan more pages.
  // With key: capped at 50 (1.1s/page × 50 = ~55s just waiting).
  const MAX_SCAN = slezaKey ? 50 : 150;
  const scored = scoredList.slice(0, MAX_SCAN).map(x => x.url);

  // Ensure current page is first
  const finalUrls = [url, ...scored.filter(u => u !== url)].slice(0, MAX_SCAN);

  const pages = [];
  let allPagesRawText = '';
  let firstSlezaError = null;
  let totalFound = 0;

  // 2. Get main page via Playwright (for AI context and links)
  onProgress?.({ phase: 'render', url });
  const mainPageContext = await buildPageContext(url);
  if (siteType === 'auto') siteType = detectSiteType(mainPageContext);

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

    // Rate limit only when Sleza key is present (otherwise checkWithSleza returns immediately)
    if (slezaKey && i < finalUrls.length - 1) {
      await new Promise(r => setTimeout(r, 1100));
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
    applyMediaOverride(aiData, siteType);
    applyServicesOverride(aiData, siteType);
  } else {
    // Discover privacy policy page — critical for accurate 152-FZ check.
    // runAIAnalysis does this internally; we replicate it for local-only mode.
    onProgress?.({ phase: 'policy', url: origin });
    const policyText = await fetchPolicyText(engine, mainPageContext, origin, mainPageContext.bodyText + ' ' + mainPageContext.header);
    // Fetch offer + about pages explicitly — on large sites they're crowded out by articles
    const extraText  = await fetchExtraText(engine, mainPageContext);

    const result152  = engine.check152FZ(policyText);
    const result149  = engine.check149FZ(allPagesText + extraText);
    const resultERIR = engine.checkERIR(allPagesText + '\n' + (mainPageContext.eridAttrs || ''));
    // checkOffer on main page only — legal terms in user-agreement trigger false SaaS detection
    const mainPageText = `${mainPageContext.title}\n${mainPageContext.header}\n${mainPageContext.bodyText}\n${mainPageContext.footer}`;
    const resultOffer = engine.checkOffer(mainPageText, mainPageContext.offerLinks);
    const resultDrugs = engine.checkDrugs(allPagesText);
    const policyHasCookies = /cookie|куки|файл[ыа]\s+cookie/i.test(policyText);
    const resultCookie = engine.checkCookieCompliance({
      hasTracking: mainPageContext.hasAdScripts,
      hasCookieBanner: mainPageContext.hasCookieBanner,
      policyHasCookies,
    });
    aiData = {
      checks: engine.buildLocalChecks({ result152, result149, resultERIR, resultOffer, resultDrugs, resultCookie, egrul, siteType }),
      site_name: mainPageContext.title,
    };
  }

  return {
    mode: 'full',
    scannedAt: new Date().toISOString(),
    url,
    hostname: (() => { try { return new URL(url).hostname; } catch { return url; } })(),
    source: urlList.source,
    pages,
    aiData,
    egrul,
    slezaError: firstSlezaError,
    stats: { discovered: urls.length, total: finalUrls.length, scanned: pages.length, found: totalFound },
  };
}
