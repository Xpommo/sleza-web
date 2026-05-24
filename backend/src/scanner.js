/**
 * Web-side scan orchestration — replaces runSinglePageScan / runFullSiteScan
 * from the Tampermonkey script.
 *
 * Key difference from the Tampermonkey version:
 * - No DOM access — uses buildPageContext() (Playwright) instead of getCurrentPageContent()
 * - No UI updates — returns plain JSON instead of rendering HTML
 * - No GM_* calls — all handled by engine.js wiring
 */
import { createRequire } from 'module';
import { createEngine } from './engine.js';
import { buildPageContext } from './pageContext.js';
import { getLastScanForDomain } from './db.js';
import { computeScanDiff, calcConfidence } from './scanDiff.js';

const _require = createRequire(import.meta.url);

// Extract text from a PDF URL. Returns empty string on any error.
async function fetchPdfText(url) {
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(15000),
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
    });
    if (!res.ok) return '';
    const buf = Buffer.from(await res.arrayBuffer());
    const pdfParse = _require('pdf-parse');
    const { text } = await pdfParse(buf);
    return text.slice(0, 15000);
  } catch {
    return '';
  }
}

function isPdfUrl(url, contentType = '') {
  return url.toLowerCase().includes('.pdf') || (contentType || '').includes('pdf');
}

// Extract text from a DOCX URL via mammoth (Word documents used by Russian B2B/застройщики).
async function fetchDocxText(url) {
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(15000),
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
    });
    if (!res.ok) return '';
    const buf = Buffer.from(await res.arrayBuffer());
    const mammoth = _require('mammoth');
    const { value } = await mammoth.extractRawText({ buffer: buf });
    return value.slice(0, 15000);
  } catch {
    return '';
  }
}

function isDocxUrl(url, contentType = '') {
  const u = url.toLowerCase();
  return u.includes('.docx') || u.includes('.doc') ||
    (contentType || '').includes('wordprocessingml') ||
    (contentType || '').includes('msword');
}

const SITEMAP_KW = /privacy|polic|ofert|legal|terms|cookie|\.pdf|\.docx|реквизит|конфиденц|соглаш|персональн|положени|protect/i;

async function tryDiscoverFromSitemap(origin) {
  const candidates = [`${origin}/sitemap.xml`, `${origin}/sitemap_index.xml`];
  const found = [];
  for (const url of candidates) {
    try {
      const res = await fetch(url, {
        signal: AbortSignal.timeout(5000),
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
      });
      if (!res.ok || !res.headers.get('content-type')?.includes('xml')) continue;
      const xml = await res.text();
      const matches = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)];
      for (const m of matches) {
        const loc = m[1].trim();
        if (SITEMAP_KW.test(loc)) found.push(loc);
      }
      if (found.length > 0) break;
    } catch { /* sitemap not found or timeout — skip */ }
  }
  return found.slice(0, 10);
}

// Extract hrefs from raw HTML that look like personal-data policy pages (1-level follow).
// Handles sites like ixbt.com where rules:persdatapolicy is only linked from rules:cookie.
function extractPolicyHrefs(html, baseUrl) {
  const re = /href=["']([^"'#]+)["']/g;
  const kw = /конфиденц|персональн|persdatapol|privacy|personal.?data|data.?protect|cookie.?polic|privacy.?notice|terms.?of|пользователь|обработка.?дан/i;
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
    if (isPdfUrl(href)) {
      const text = await fetchPdfText(href);
      if (text.length > 200) combined += '\n' + text;
      continue;
    }
    if (isDocxUrl(href)) {
      const text = await fetchDocxText(href);
      if (text.length > 200) combined += '\n' + text;
      continue;
    }
    const p = await engine.fetchUrl(href);
    if (!p.ok || p.text.length < 200) continue;
    combined += '\n' + htmlToText(p.text);
    // Follow 1 level: find personal-data policy links inside this page
    for (const sub of extractPolicyHrefs(p.text, href)) {
      if (visited.has(sub)) continue;
      visited.add(sub);
      if (isPdfUrl(sub)) {
        const t = await fetchPdfText(sub);
        if (t.length > 200) combined += '\n' + t;
      } else if (isDocxUrl(sub)) {
        const t = await fetchDocxText(sub);
        if (t.length > 200) combined += '\n' + t;
      } else {
        const sp = await engine.fetchUrl(sub);
        if (sp.ok && sp.text.length > 200) combined += '\n' + htmlToText(sp.text);
      }
    }
  }
  // Only use combined text if it looks like an actual privacy policy (≥4/7 152-FZ sections).
  // Prevents community «Правила» / conduct-rules pages (which land in offerLinks) from
  // being used as policy when a proper /privacy page exists.
  if (combined.length > 200 && engine.check152FZ(combined).found >= 4) {
    return { text: combined, found: true };
  }

  // Inline modal text: extracted by clicking a policy button in Playwright.
  // Already plain text (innerText) — no htmlToText() needed.
  const modalText = pageContext.inlineModalPolicyText || '';
  if (modalText.length > 200 && engine.check152FZ(modalText).found >= 2) {
    return { text: modalText, found: true };
  }

  // Fallback 1: probe common URL patterns via script's built-in discovery
  const policyPages = await engine.discoverPolicyByCommonPaths(origin);
  if (policyPages[0]?.text) return { text: htmlToText(policyPages[0].text), found: true };

  // Fallback 1.5: sitemap-discovered pages (catches policies not linked from nav)
  if (origin) {
    const sitemapUrls = await tryDiscoverFromSitemap(origin);
    for (const url of sitemapUrls) {
      if (visited.has(url)) continue;
      visited.add(url);
      if (isPdfUrl(url)) {
        const text = await fetchPdfText(url);
        if (text.length > 500) return { text, found: true };
      } else {
        const r = await engine.fetchUrl(url);
        if (r.ok && r.text.length > 500) return { text: htmlToText(r.text), found: true };
      }
    }
  }

  // Fallback 2: try additional paths not covered by discoverPolicyByCommonPaths
  // (e.g. artlebedev.ru uses /terms/, some sites use /legal/, /rules/)
  const EXTRA_PATHS = [
    '/terms', '/terms/', '/legal', '/legal/', '/rules', '/rules/',
    '/user-agreement', '/agreement', '/tos', '/privacypolicy',
    '/terms-of-service', '/cookie-policy', '/cookies',
    '/data-protection', '/personal-information',
    '/legal/privacy', '/legal/terms', '/legal/cookies',
    '/info/privacy', '/info/terms', '/info/personal-data',
    '/документы', '/docs',
    '/help/privacy', '/help/terms', '/help/personal-data',
    '/support/privacy', '/support/terms',
    '/pages/privacy', '/pages/terms',
    '/faq/privacy', '/faq/personal-data',
    '/article/personal_data', '/v10/privacy',
  ];
  for (const path of EXTRA_PATHS) {
    const url = origin + path;
    if (visited.has(url)) continue;
    visited.add(url);
    const r = await engine.fetchUrl(url);
    if (r.ok && r.text.length > 500) return { text: htmlToText(r.text), found: true };
  }

  // Policy not found/accessible — return fallback text with found=false so callers
  // can treat 152-FZ as risk (not violation) when we can't verify the policy exists.
  return { text: fallback, found: false };
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
async function fetchExtraText(engine, pageContext, origin) {
  const hrefs = [
    ...(pageContext.offerLinks  || []).map(l => l.href),
    ...(pageContext.aboutLinks  || []).map(l => l.href),
    ...(pageContext.policyLinks || []).map(l => l.href),
  ].filter((h, i, a) => h && a.indexOf(h) === i);

  let extra = '';
  const visited = new Set(hrefs);

  for (const href of hrefs) {
    if (isPdfUrl(href)) {
      extra += '\n' + await fetchPdfText(href);
    } else if (isDocxUrl(href)) {
      extra += '\n' + await fetchDocxText(href);
    } else {
      const r = await engine.fetchUrl(href);
      if (r.ok) extra += '\n' + htmlToText(r.text);
    }
  }

  if (origin) {
    // Always probe common offer PDF paths — many Russian SaaS/B2B sites
    // put INN/OGRN only in a PDF document (e.g. callibri.ru/Offer.pdf)
    const PDF_PATHS = [
      '/Offer.pdf', '/offer.pdf', '/Oferta.pdf', '/oferta.pdf',
      '/terms.pdf', '/terms_of_use.pdf', '/user_agreement.pdf',
      '/agreement.pdf', '/contract.pdf', '/оферта.pdf',
      '/privacy_policy.pdf', '/privacy.pdf', '/personal_data.pdf',
      '/политика.pdf', '/соглашение.pdf',
      '/Dogovor.pdf', '/dogovor.pdf',
      '/license.pdf', '/licence.pdf',
      '/sla.pdf', '/public-offer.pdf',
      '/reglament.pdf', '/регламент.pdf',
      '/политика-конфиденциальности.pdf',
    ];
    for (const path of PDF_PATHS) {
      const url = origin + path;
      if (visited.has(url)) continue;
      visited.add(url);
      const text = await fetchPdfText(url);
      if (text.length > 200) { extra += '\n' + text; break; }
    }

    // Fallback HTML paths — try when no links found at all
    if (!extra.trim()) {
      const REKVIZITY_PATHS = ['/contacts', '/contact', '/about', '/о-компании',
        '/rekvizity', '/реквизиты', '/company', '/terms', '/legal',
        '/rbc_about', '/about-us', '/company/about', '/info/about', '/help/about',
        '/о-компании/реквизиты', '/legal/about'];
      for (const path of REKVIZITY_PATHS) {
        const url = origin + path;
        if (visited.has(url)) continue;
        const r = await engine.fetchUrl(url);
        if (r.ok && r.text.length > 200) { extra += '\n' + htmlToText(r.text); break; }
      }
    }
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
  if (!aiData?.checks) return;
  // Also apply for 'auto' when AI itself misclassified site as «торговая площадка»
  const offerCheck = aiData.checks.find(c => c.id === 'offer' || (c.law || '').includes('офер') || (c.law || '').includes('Оферт'));
  const aiMisclassified = siteType === 'auto' && (offerCheck?.issue || '').includes('торговая площадка');
  if (!['services', 'saas'].includes(siteType) && !aiMisclassified) return;
  const effectiveSiteType = ['services', 'saas'].includes(siteType) ? siteType : 'saas';
  const offer = aiData.checks.find(c => c.id === 'offer' || (c.law || '').includes('офер') || (c.law || '').includes('Оферт') || (c.law || '').toLowerCase().includes('offer'));
  if (offer && offer.status !== 'ok' && offer.issue) {
    // Check if the ONLY complaint is "условия возврата товара" (not applicable for SaaS/services).
    // Strip all non-substantive parts: prefixes, the classifier, the return-goods clause itself.
    const coreRemains = offer.issue
      .replace(/отсутствует[:\s]*/gi, '')
      .replace(/условия?\s+возврата\s+товара[;,]?\s*/gi, '')
      .replace(/\(торговая\s+площадка\)/gi, '')
      .replace(/\(лицензионный\s+договор[^)]*\)/gi, '')
      .replace(/[;,]\s*/g, ' ')
      .trim();

    if (!coreRemains || coreRemains.length < 5) {
      // The only issue was "возврат товара" — not applicable for SaaS/services
      offer.status = 'ok';
      offer.issue = effectiveSiteType === 'saas'
        ? 'Лицензионный договор и условия расторжения на месте (SaaS — возврат товара не применяется)'
        : 'Договор оказания услуг и условия расторжения на месте (возврат товара не применяется)';
      offer.fine = '';
      return;
    }

    // Partial cleanup: remove "возврат товара" and fix classifier label
    const cleanedIssue = offer.issue
      .replace(/условия?\s+возврата\s+товара[;,]?\s*/gi, '')
      .replace(/\(торговая\s+площадка\)/gi, effectiveSiteType === 'saas' ? '(лицензионный договор / SaaS)' : '(платные услуги / договор оказания услуг)')
      .trim().replace(/^[;,\s]+/, '');

    offer.issue = cleanedIssue;
    // Downgrade violation → risk: services/saas use license/service contracts, not retail offer
    if (offer.status === 'violation') {
      offer.status = 'risk';
      offer.fine = '';
    }
    if (offer.action) {
      offer.action = effectiveSiteType === 'saas'
        ? 'Рекомендуется убедиться что лицензионный договор (оферта) содержит порядок расторжения и реквизиты (ИНН/ОГРН)'
        : 'Рекомендуется опубликовать шаблон договора оказания услуг с реквизитами (ИНН/ОГРН, адрес, email) и порядком расторжения';
    }
  }
}

/**
 * Auto-detect site type from page context when user left selector at 'auto'.
 * Returns 'ip', 'media', 'ecommerce', 'services', 'saas', or 'auto' (= full checks).
 */
function detectSiteType(pageContext) {
  const titleHeader = `${pageContext.title || ''} ${pageContext.header || ''}`.toLowerCase();
  const body2k = (pageContext.bodyText || '').slice(0, 2000).toLowerCase();
  const footer  = (pageContext.footer || '').toLowerCase();
  const text    = titleHeader + ' ' + body2k + ' ' + footer;
  const allLinks = (pageContext.links || []).map(l => (l.href || '').toLowerCase());
  const hostname = (() => { try { return new URL(pageContext.url || '').hostname.toLowerCase(); } catch { return ''; } })();

  // ИП detection — ОГРНИП is 15 digits (starts with 3), ИНН for ИП is 12 digits.
  // Detect via explicit "ИП" marker in footer/text or ОГРНИП pattern.
  const ipTextRe = /\bип\s+[а-яёa-z]/i;
  const ogrnipRe = /огрнип[\s:№.]*3\d{14}/i;
  const ipNameRe = /индивидуальн[а-яё]+\s+предприниматель/i;
  const inn12Re  = /инн[\s:№.]*\d{12}\b/i;
  if (ipTextRe.test(footer) || ogrnipRe.test(text) || ipNameRe.test(text) ||
      (inn12Re.test(text) && ipTextRe.test(text)))
    return 'ip';

  // Media/news/community signals — check title+header first, then body
  const mediaRe = /новост|обзор|статьи|журнал|\bсми\b|медиа|редакци|публикац|пресс-релиз|\bблог\b|сообществ|контент.платформ|издани|колонк/;
  if (mediaRe.test(titleHeader)) return 'media';
  // Community platforms (vc.ru, dtf.ru, habr.com): body shows user UX patterns + topic taxonomy
  const communityRe = /моя\s+лента|написать[\s\S]{0,30}войти|ваша\s+лента|новая\s+публикаци/;
  if (communityRe.test(body2k)) return 'media';
  // Body-level media signals (page title may omit them but body/nav contains them)
  // Real estate / developer sites often have a news section — don't classify them as media.
  const realEstateRe = /квартир|недвижим|новостройк|застройщ|жилой.комплекс|девелоп|жк\s|дом[еа]\s|планировк/;
  if (mediaRe.test(body2k) &&
      !(/магазин|купить|каталог товар/.test(titleHeader)) &&
      !realEstateRe.test(text)) return 'media';

  // Services/corporate/edu signals
  const servicesDomainRe = /institut|clinic|hospital|academy|school|university|edu\.|\.edu|медцентр|клиник|больниц/;
  const servicesTextRe   = /институт|клиника|больниц|академия|университет|факультет|кафедр|АНО\b|НКО\b|ДПО\b|ЧОУ\b|ФГБУ|ФГБОУ|кабинет\s+врач|медицинск|стоматолог|поликлиник|образовательн|учебн[ыйое]+\s+центр|курсы\s+повышени|профессиональн[ао]+\s+переподготовк/;
  if (servicesDomainRe.test(hostname) || servicesTextRe.test(titleHeader)) return 'services';
  // Installation/repair/construction services — individual contracts after on-site measurement.
  // Public offer not required: final price determined after measurement, not fixed online.
  const installServiceRe = /бесплатн[ыйое]+\s+замер|выезд\s+(на\s+)?замер|замер\s+бесплатн|натяжн[а-яё]+\s+потол|монтаж\s+[а-яё]|установк[ауи]\s+[а-яё]|ремонт\s+[а-яё]|отделочн|под\s+ключ|выезд\s+мастер|бригад[аы]\s+мастер/i;
  if (installServiceRe.test(titleHeader) || installServiceRe.test(body2k)) return 'services';

  // SaaS signals — checked BEFORE ecommerce because SaaS sites often have /product/ URLs
  // Note: \b does not work for Cyrillic in JS — use substring or lookahead patterns
  const saasTextHits = [
    /тариф/.test(text),
    /подписк/.test(text) && !/новостная|email.подписк|рассылк/.test(text),
    /pricing|per.month/.test(text),
    /корпоративн[а-яё]+\s+(?:план|тариф|лицензи|решени)/.test(text),
    /платформ/.test(text) && !/строительн|девелоп|недвижим/.test(text),
    /сервис(?!н)/.test(titleHeader) && !/автосервис/.test(titleHeader),
    /\bapi\b/.test(text) && /интеграц/.test(text),
  ].filter(Boolean).length;
  if (saasTextHits >= 2) return 'saas';
  if (allLinks.some(l => /\/(pricing|plans|tariff|цены|tarify)\b/.test(l))) return 'saas';

  // E-commerce signals
  if (/магазин|интернет.магазин|купить|каталог товар/.test(titleHeader)) return 'ecommerce';
  if (allLinks.some(l => /\/(cart|basket|checkout|product|catalog)\b/.test(l))) return 'ecommerce';

  return 'auto';
}

/**
 * ИП-specific overrides:
 * - ОГРНИП (15 digits) instead of ОГРН (13 digits) for 149-FZ
 * - Пользовательское соглашение counts as valid offer substitute
 * - ИНН is 12 digits for physical person
 */
function applyIPOverride(aiData) {
  if (!aiData?.checks) return;

  // 149-FZ: ОГРНИП (15 digits) and ИНН физлица (12 digits), not ОГРН/ИНН of organisation.
  // Note: buildLocalChecks in the script already applies this for local-only scans; here we
  // handle AI-generated results where the text may still contain organisation wording.
  const law149 = aiData.checks.find(c => c.id === 'law149');
  if (law149) {
    if (law149.issue) {
      law149.issue = law149.issue
        .replace(/огрн\b/gi, 'ОГРНИП')
        .replace(/инн\s+организации/gi, 'ИНН ИП (12 цифр)');
    }
    if (law149.action) {
      law149.action = 'Опубликовать на сайте (footer или страница "Реквизиты"): ' +
        'полное ФИО — "ИП Иванов Иван Иванович", ОГРНИП (15 цифр), ИНН (12 цифр), ' +
        'адрес регистрации, email или телефон.';
    }
  }

  // Offer: пользовательское соглашение = valid offer substitute for ИП service/SaaS sites.
  // Ecommerce ИП still need return conditions under ЗоЗПП ст.26.1 and ПП 2463 — keep them.
  const offer = aiData.checks.find(c => c.id === 'offer');
  if (offer && offer.status !== 'ok') {
    if (offer.status === 'violation') offer.status = 'risk';
    const isEcommerce = /торговая\s+площадка/i.test(offer.issue || '');
    if (!isEcommerce) {
      if (offer.issue) {
        offer.issue = offer.issue
          .replace(/условия?\s+возврата\s+товара[^;.]*/gi, '')
          .replace(/торговая\s+площадка/gi, 'цифровой сервис ИП')
          .trim().replace(/^[;,\s]+/, '');
      }
      offer.action = 'Пользовательское соглашение заменяет публичную оферту для ИП. ' +
        'Добавьте в соглашение: ОГРНИП, ИНН (12 цифр), адрес регистрации, email, ' +
        'порядок расторжения. Ссылку на соглашение — в footer сайта.';
    } else {
      offer.action = 'ИП-продавец: опубликуйте оферту с условиями возврата товара ' +
        '(ЗоЗПП ст.26.1 — 7 дней), ОГРНИП, ИНН (12 цифр) и адресом регистрации.';
    }
  }

  // 152-FZ: operator must be named as "ИП Фамилия И.О." in the privacy policy
  const law152 = aiData.checks.find(c => c.id === 'law152');
  if (law152 && law152.status !== 'ok' && law152.action && law152.action !== '—' &&
      !law152.action.includes('ИП Фамилия')) {
    law152.action += ' Укажите оператора ПД как "ИП Фамилия И.О." вместо названия организации.';
  }
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
  // Promote siteType to 'ip' if EGRUL confirms the owner is an individual entrepreneur
  if (siteType !== 'ip' && egrulResult?.parsed?.type === 'ip') siteType = 'ip';

  // 4. AI analysis (152-FZ, ERIR, offer, drugs, cookie) — or local-only if useAI=false
  let aiData;
  if (useAI && groqKey) {
    aiData = await engine.runAIAnalysis(pageContext, egrul, fullText, siteType);
    applyMediaOverride(aiData, siteType);
    applyServicesOverride(aiData, siteType);
    if (siteType === 'ip') applyIPOverride(aiData);

    // Ground-truth overrides: local binary signals are more reliable than AI for these two checks.
    // Run targeted local verification only when AI returned a violation — avoids double-fetching otherwise.
    // NOTE: AI returns checks with field "law" (human name), local path uses "id" (short code).
    //       findAICheck matches both formats.
    const findAICheck = (checks, id, lawSnippet) =>
      checks?.find(c => c.id === id || (c.law || '').includes(lawSnippet));

    const check149AI = findAICheck(aiData.checks, 'law149', '149');
    if (check149AI && check149AI.status !== 'ok') {
      // INN/OGRN regex is unambiguous — if local finds it in extraText (no length cap), trust local over AI
      const extraText149 = await fetchExtraText(engine, pageContext, origin);
      const result149local = engine.check149FZ(fullText + extraText149);
      if (result149local.status === 'ok') {
        check149AI.status = 'ok';
        check149AI.issue = result149local.issue || 'Обязательные реквизиты владельца на сайте указаны';
      }
    }
    const checkERIRAI = findAICheck(aiData.checks, 'erir', 'ЕРИР');
    if (checkERIRAI && checkERIRAI.status !== 'ok') {
      // No ad-network scripts detected → no third-party ad content → ЕРИР not required.
      // Overrides AI hallucination when it confuses self-promotion or «Партнёрам» nav links with advertising.
      const adTextMarker = /на правах реклам|рекламный материал|партнёрский материал|спонсорский материал|рекламодатель|sponsored content/i;
      const effectiveHasAds = pageContext.hasAdScripts || (pageContext.hasGtm && adTextMarker.test(fullText));
      if (!effectiveHasAds) {
        checkERIRAI.status = 'ok';
        checkERIRAI.issue = 'Рекламного контента не обнаружено (рекламные скрипты не найдены)';
        checkERIRAI.fine = '';
      }
    }
  } else {
    // Discover privacy policy page for accurate 152-FZ check
    // (homepage rarely has the full policy text)
    const { text: policyText, found: policyFound } = await fetchPolicyText(engine, pageContext, origin, fullText);
    let result152 = engine.check152FZ(policyText + ' ' + pageContext.header);
    // If policy was inaccessible (401/403/not found), cap at risk — can't prove violation
    if (!policyFound && result152.status === 'violation') result152 = { ...result152, status: 'risk' };
    // Fetch offer + about pages — rekvizity (INN, address, phone) often live in user-agreement
    const extraText  = await fetchExtraText(engine, pageContext, origin);
    // C1: INN/OGRN are often only in the homepage footer — include it when scanning a subpage
    let homepageText = '';
    const isSubpage = url !== origin && url !== origin + '/';
    if (isSubpage) {
      const homeR = await engine.fetchUrl(origin);
      if (homeR.ok) homepageText = '\n' + htmlToText(homeR.text).slice(0, 4000);
    }
    const result149  = engine.check149FZ(fullText + extraText + homepageText);
    const adTextMarker = /на правах реклам|рекламный материал|партнёрский материал|спонсорский материал|рекламодатель|sponsored content/i;
    const effectiveHasAdScripts = pageContext.hasAdScripts || (pageContext.hasGtm && adTextMarker.test(fullText));
    const resultERIR = engine.checkERIR(fullText + '\n' + (pageContext.eridAttrs || ''), { hasAdScripts: effectiveHasAdScripts });
    // Include extraText so PDF offer documents are checked for seller info / return conditions
    const resultOffer = engine.checkOffer(fullText + '\n' + extraText, pageContext.offerLinks);
    const resultDrugs = engine.checkDrugs(fullText);
    const policyHasCookies = /cookie|куки|файл[ыа]\s+cookie/i.test(policyText);
    const resultCookie = engine.checkCookieCompliance({
      hasTracking: effectiveHasAdScripts,
      hasCookieBanner: pageContext.hasCookieBanner,
      policyHasCookies,
      hasConsentCheckbox: pageContext.hasConsentCheckbox,
    });
    aiData = {
      checks: engine.buildLocalChecks({ result152, result149, resultERIR, resultOffer, resultDrugs, resultCookie, egrul, siteType, hasPolicyFooterLink: pageContext.hasPolicyFooterLink }),
      site_name: pageContext.title,
    };
    // Promote to 'ip' if ИП detected in extraText/PDF (not visible in main page HTML)
    if (siteType !== 'ip' && /\bип\s+[а-яёa-z]|огрнип|индивидуальн[а-яё]+\s+предприниматель/i.test(extraText + homepageText))
      siteType = 'ip';
    applyMediaOverride(aiData, siteType);
    applyServicesOverride(aiData, siteType);
    if (siteType === 'ip') applyIPOverride(aiData);
  }

  const hostname = (() => { try { return new URL(url).hostname; } catch { return url; } })();
  const prevScan = await getLastScanForDomain(hostname);
  const result = {
    mode: 'single',
    scannedAt: new Date().toISOString(),
    fallback: pageContext._fallback || false,
    blocked403: pageContext._http403 || false,
    url,
    hostname,
    pages: [{ url, title: pageContext.title, items: checked, isCurrent: true }],
    aiData,
    egrul,
    slezaError: slezaResult.errors || null,
  };
  result.confidence = calcConfidence(result, [pageContext], useAI && !!groqKey);
  result.diff = computeScanDiff(prevScan?.result_json ?? null, result);
  return result;
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

  // C2: Three-tier URL stratification to guarantee compliance pages are always scanned.
  //
  // Layer 1 — mandatory (always included): homepage + common compliance paths.
  //   These are guaranteed regardless of score — they hold policy/contacts/legal info.
  const COMPLIANCE_PATHS = [
    '/privacy', '/personal-data', '/policy', '/cookies', '/gdpr',
    '/about', '/contacts', '/contact', '/oferta', '/offer', '/terms', '/rules',
    '/rekvizity', '/реквизиты', '/политика', '/конфиденциальность', '/о-компании',
    '/cookie-policy', '/cookies-policy', '/cookie-notice',
    '/terms-of-service', '/tos',
    '/advertising', '/advertising-policy',
    '/legal', '/legal/privacy', '/legal/terms',
    '/data-protection', '/защита-данных',
    '/user-agreement', '/пользовательское-соглашение',
  ];
  const layer1 = new Set([origin, origin + '/']);
  for (const p of COMPLIANCE_PATHS) {
    const candidate = origin + p;
    if (urls.includes(candidate)) layer1.add(candidate);
  }
  // Also include policy pages discovered by discoverPolicyByCommonPaths (already in urlList via sitemap)
  for (const u of urls) {
    const path = (() => { try { return new URL(u).pathname.toLowerCase(); } catch { return ''; } })();
    if (COMPLIANCE_PATHS.some(p => path === p || path === p + '/')) layer1.add(u);
  }

  // Layer 2 — scored: top compliance-scored pages not already in layer 1.
  const LAYER2_MAX = Math.floor(MAX_SCAN * 0.7); // 70% of budget
  const layer2 = scoredList
    .filter(x => !layer1.has(x.url))
    .slice(0, LAYER2_MAX)
    .map(x => x.url);

  // Layer 3 — random sample: stride-sample from remaining pages not in layers 1+2.
  const LAYER3_MAX = Math.floor(MAX_SCAN * 0.15); // 15% of budget
  const inLayers = new Set([...layer1, ...layer2]);
  const remaining = urls.filter(u => !inLayers.has(u));
  const step = remaining.length > LAYER3_MAX ? Math.floor(remaining.length / LAYER3_MAX) : 1;
  const layer3 = remaining.filter((_, i) => i % step === 0).slice(0, LAYER3_MAX);

  // Merge: start with current page, then layer1, layer2, layer3
  const seen = new Set();
  const finalUrls = [url, ...layer1, ...layer2, ...layer3]
    .filter(u => seen.has(u) ? false : (seen.add(u), true))
    .slice(0, MAX_SCAN);

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
  // Promote siteType to 'ip' if EGRUL confirms the owner is an individual entrepreneur
  if (siteType !== 'ip' && egrulResult?.parsed?.type === 'ip') siteType = 'ip';

  // 5. AI analysis on main page context
  onProgress?.({ phase: 'ai', url });
  let aiData;
  if (useAI && groqKey) {
    aiData = await engine.runAIAnalysis(mainPageContext, egrul, allPagesText, siteType);
    applyMediaOverride(aiData, siteType);
    applyServicesOverride(aiData, siteType);
    if (siteType === 'ip') applyIPOverride(aiData);

    // Ground-truth overrides (same logic as single-page scan — see comment there)
    const findAICheckFull = (checks, id, lawSnippet) =>
      checks?.find(c => c.id === id || (c.law || '').includes(lawSnippet));

    const check149AIFull = findAICheckFull(aiData.checks, 'law149', '149');
    if (check149AIFull && check149AIFull.status !== 'ok') {
      const extraText149 = await fetchExtraText(engine, mainPageContext, origin);
      const result149local = engine.check149FZ(allPagesText + extraText149);
      if (result149local.status === 'ok') {
        check149AIFull.status = 'ok';
        check149AIFull.issue = result149local.issue || 'Обязательные реквизиты владельца на сайте указаны';
      }
    }
    const checkERIRAIFull = findAICheckFull(aiData.checks, 'erir', 'ЕРИР');
    if (checkERIRAIFull && checkERIRAIFull.status !== 'ok') {
      const adTextMarker = /на правах реклам|рекламный материал|партнёрский материал|спонсорский материал|рекламодатель|sponsored content/i;
      const mainPageText = `${mainPageContext.title}\n${mainPageContext.header}\n${mainPageContext.bodyText}\n${mainPageContext.footer}`;
      const effectiveHasAds = mainPageContext.hasAdScripts || (mainPageContext.hasGtm && adTextMarker.test(mainPageText));
      if (!effectiveHasAds) {
        checkERIRAIFull.status = 'ok';
        checkERIRAIFull.issue = 'Рекламного контента не обнаружено (рекламные скрипты не найдены)';
        checkERIRAIFull.fine = '';
      }
    }
  } else {
    // Discover privacy policy page — critical for accurate 152-FZ check.
    // runAIAnalysis does this internally; we replicate it for local-only mode.
    onProgress?.({ phase: 'policy', url: origin });
    const { text: policyText, found: policyFound } = await fetchPolicyText(engine, mainPageContext, origin, mainPageContext.bodyText + ' ' + mainPageContext.header);
    // Fetch offer + about pages explicitly — on large sites they're crowded out by articles
    const extraText  = await fetchExtraText(engine, mainPageContext, origin);

    let result152 = engine.check152FZ(policyText);
    if (!policyFound && result152.status === 'violation') result152 = { ...result152, status: 'risk' };
    const result149  = engine.check149FZ(allPagesText + extraText);
    // ERIR: check main page only — allPagesText includes blog/articles about advertising
    // which cause false positives on marketing platforms (callibri, roistat, etc.)
    const mainPageText = `${mainPageContext.title}\n${mainPageContext.header}\n${mainPageContext.bodyText}\n${mainPageContext.footer}`;
    const adTextMarkerFull = /на правах реклам|рекламный материал|партнёрский материал|спонсорский материал|рекламодатель|sponsored content/i;
    const effectiveHasAdScriptsFull = mainPageContext.hasAdScripts || (mainPageContext.hasGtm && adTextMarkerFull.test(mainPageText));
    const resultERIR = engine.checkERIR(mainPageText + '\n' + (mainPageContext.eridAttrs || ''), { hasAdScripts: effectiveHasAdScriptsFull });
    // checkOffer: include extraText so PDF offer documents (e.g. /Offer.pdf) are checked
    const resultOffer = engine.checkOffer(mainPageText + '\n' + extraText, mainPageContext.offerLinks);
    const resultDrugs = engine.checkDrugs(allPagesText);
    const policyHasCookies = /cookie|куки|файл[ыа]\s+cookie/i.test(policyText);
    const resultCookie = engine.checkCookieCompliance({
      hasTracking: effectiveHasAdScriptsFull,
      hasCookieBanner: mainPageContext.hasCookieBanner,
      policyHasCookies,
      hasConsentCheckbox: mainPageContext.hasConsentCheckbox,
    });
    aiData = {
      checks: engine.buildLocalChecks({ result152, result149, resultERIR, resultOffer, resultDrugs, resultCookie, egrul, siteType, hasPolicyFooterLink: mainPageContext.hasPolicyFooterLink }),
      site_name: mainPageContext.title,
    };
    // Promote to 'ip' if ИП detected in extraText/PDF even if not visible in main page HTML
    if (siteType !== 'ip' && /\bип\s+[а-яёa-z]|огрнип|индивидуальн[а-яё]+\s+предприниматель/i.test(extraText))
      siteType = 'ip';
    applyMediaOverride(aiData, siteType);
    applyServicesOverride(aiData, siteType);
    if (siteType === 'ip') applyIPOverride(aiData);
  }

  const hostname = (() => { try { return new URL(url).hostname; } catch { return url; } })();
  const prevScan = await getLastScanForDomain(hostname);
  const result = {
    mode: 'full',
    scannedAt: new Date().toISOString(),
    blocked403: mainPageContext._http403 || false,
    url,
    hostname,
    source: urlList.source,
    pages,
    aiData,
    egrul,
    slezaError: firstSlezaError,
    stats: { discovered: urls.length, total: finalUrls.length, scanned: pages.length, found: totalFound },
  };
  result.confidence = calcConfidence(result, [mainPageContext], useAI && !!groqKey);
  result.diff = computeScanDiff(prevScan?.result_json ?? null, result);
  return result;
}

