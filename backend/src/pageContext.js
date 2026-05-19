/**
 * Server-side DOM extraction via Playwright (headless Chromium).
 *
 * Why Playwright instead of plain HTML parsing?
 * - Many Russian sites (VC.ru, Tinkoff, corporate React/Vue sites) render content via JS.
 *   A plain fetch() returns an empty skeleton; Playwright runs JS and gives us real content.
 * - page.evaluate() runs JS *inside* the browser — so we use the same logic as
 *   getCurrentPageContent() in the Tampermonkey script, just moved server-side.
 * - Result: same quality as running the extension manually in Chrome.
 *
 * Browser lifecycle:
 * - A single Chromium instance is launched lazily on first request and reused.
 * - Each scan gets its own BrowserContext (isolated cookies/storage) which is
 *   closed after use — this keeps scans isolated without the cost of relaunching.
 * - Call closeBrowser() on process shutdown (wired in server.js).
 */
import { chromium } from 'playwright';

const KW = {
  policy: ['политик','конфиденц','персональн','privacy','cookie','gdpr','согласие','persdata','personal-data','/policy','/policies'],
  offer:  ['оферт','договор','правила','усло','public-offer','соглашен','agreement','terms'],
  ret:    ['возврат','обмен','отказ'],
  about:  ['о компани','о нас','контакт','about','contact','реквизит'],
};

let _browser = null;

async function getBrowser() {
  if (!_browser || !_browser.isConnected()) {
    _browser = await chromium.launch({ headless: true });
  }
  return _browser;
}

export async function closeBrowser() {
  if (_browser) {
    await _browser.close();
    _browser = null;
  }
}

/**
 * Navigates to the URL in a fresh browser context and extracts the same
 * fields that getCurrentPageContent() reads from the live DOM in Tampermonkey.
 *
 * @param {string} url
 * @param {{ timeout?: number }} options
 * @returns {Promise<object>} pageContent object expected by runAIAnalysis()
 */
export async function buildPageContext(url, { timeout = 20000 } = {}) {
  const browser = await getBrowser();
  const browserCtx = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    locale: 'ru-RU',
    extraHTTPHeaders: { 'Accept-Language': 'ru-RU,ru;q=0.9,en;q=0.8' },
    ignoreHTTPSErrors: true,
  });
  try {
    const page = await browserCtx.newPage();

    await page.goto(url, { waitUntil: 'load', timeout });

    // Wait for JS hydration (React/Vue), and for any post-load redirects to settle
    await page.waitForTimeout(2000);

    // Scroll slightly to trigger lazy-loaded cookie banners (some appear only on scroll)
    await page.evaluate(() => window.scrollTo(0, 400));
    await page.waitForTimeout(600);

    // Run the same extraction logic as getCurrentPageContent() — inside the real browser
    const context = await page.evaluate((kw) => {
      const matchesKw = (text, kws) => {
        const t = (text || '').toLowerCase();
        return kws.some(k => t.includes(k));
      };

      // Allow links from same root domain incl. subdomains (e.g. forum.ixbt.com for ixbt.com)
      const rootDomain = location.hostname.split('.').slice(-2).join('.');
      const sameDomain = href => {
        try { const h = new URL(href).hostname; return h === rootDomain || h.endsWith('.' + rootDomain); }
        catch { return false; }
      };
      const links = Array.from(document.querySelectorAll('a[href]'))
        .map(a => ({
          text: (a.innerText || a.textContent || '').trim().slice(0, 80),
          href: a.href,
          path: (() => { try { return new URL(a.href).pathname.toLowerCase(); } catch { return ''; } })(),
        }))
        .filter(l => l.text && sameDomain(l.href));

      const seen = new Set();
      const uniqueLinks = links.filter(l => seen.has(l.href) ? false : (seen.add(l.href), true));

      const headerEl = document.querySelector('header,#header,.header');
      const footerEl = document.querySelector('footer,#footer,.footer');

      const m = (l, kws) => matchesKw(l.text + ' ' + l.path, kws);

      const adScriptSelectors = [
        'script[src*="googletagmanager"]','script[src*="google-analytics"]','script[src*="gtag"]',
        'script[src*="mc.yandex"]','script[src*="metrika"]','script[src*="top.mail.ru"]',
        'script[src*="vk.com/js"]','script[src*="facebook.net"]',
        'script[src*="hotjar"]','script[src*="roistat"]',
      ].join(',');

      const cookieBannerSelectors = [
        '[class*="cookie-banner"],[class*="cookie-consent"],[class*="cookie-notice"]',
        '[id*="cookie-banner"],[id*="cookie-consent"]',
        '[class*="gdpr"],[id*="gdpr"]',
      ].join(',');

      // Text-based cookie banner detection — catches Russian banners with custom class names
      const cookieTextRe = /\b(cookie|куки)\b|согласие\s+на\s+(обработку|использование)\s+персональн|принять\s+(все\s+)?(cookie|куки)|политик[ауе]\s+(cookie|куки)/i;
      const hasCookieBannerByText = (() => {
        const candidates = document.querySelectorAll('div[class],section[class],aside[class],div[id],section[id]');
        for (const el of candidates) {
          const text = el.innerText || '';
          if (text.length < 20 || text.length > 600) continue;
          if (!cookieTextRe.test(text)) continue;
          const s = window.getComputedStyle(el);
          if (s.display !== 'none' && s.visibility !== 'hidden' && s.opacity !== '0') return true;
        }
        return false;
      })();

      // JSON-LD structured data — many Russian business sites put ИНН/ОГРН here
      const jsonLdText = (() => {
        const out = [];
        document.querySelectorAll('script[type="application/ld+json"]').forEach(s => {
          try { out.push(s.textContent); } catch (_) {}
        });
        return out.join(' ');
      })();

      // ERID tokens in HTML attributes (native ads often use data-erid instead of visible text)
      const eridAttrs = Array.from(
        document.querySelectorAll('[data-erid],[data-erid-token]')
      ).map(el => {
        const v = el.getAttribute('data-erid') || el.getAttribute('data-erid-token') || '';
        return v ? `erid=${v}` : '';
      }).filter(Boolean).join(' ');

      // Image alt texts in footer — ИНН/ОГРН sometimes rendered as images
      const footerImgAlt = footerEl
        ? Array.from(footerEl.querySelectorAll('img[alt]')).map(img => img.alt).join(' ')
        : '';

      // Exclude content/article paths from compliance link categories
      // to avoid news headlines with «персональн» being classified as policy pages
      const isContentPath = p => /\/\d{4}\/\d{2}[/\-]|\/(news|article|review|blog|post|video|forum)\//i.test(p);

      return {
        url: location.href,
        title: (document.title || '').replace(/<[^>]+>/g, '').trim(),
        header: headerEl ? headerEl.innerText.slice(0, 500) : '',
        footer: footerEl ? (footerEl.innerText + ' ' + footerImgAlt).slice(0, 1200) : '',
        bodyText: (() => {
          const t = document.body.innerText;
          if (t.length <= 10000) return t;
          return t.slice(0, 8000) + '\n' + t.slice(-2000);
        })(),
        jsonLdText,
        eridAttrs,
        links: uniqueLinks.slice(0, 40),
        policyLinks: uniqueLinks.filter(l => !isContentPath(l.path) && m(l, kw.policy)).slice(0, 2),
        offerLinks:  uniqueLinks.filter(l => !isContentPath(l.path) && m(l, kw.offer)).slice(0, 2),
        returnLinks: uniqueLinks.filter(l => !isContentPath(l.path) && m(l, kw.ret)).slice(0, 2),
        aboutLinks:  uniqueLinks.filter(l => !isContentPath(l.path) && m(l, kw.about)).slice(0, 2),
        hasAdScripts:    document.querySelectorAll(adScriptSelectors).length > 0,
        hasCookieBanner: document.querySelectorAll(cookieBannerSelectors).length > 0 || hasCookieBannerByText,
      };
    }, KW);

    return context;
  } finally {
    await browserCtx.close();
  }
}
