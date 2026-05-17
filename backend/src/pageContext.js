/**
 * Server-side DOM extraction via Playwright (headless Chromium).
 *
 * Why Playwright instead of plain HTML parsing?
 * - Many Russian sites (VC.ru, Tinkoff, corporate React/Vue sites) render content via JS.
 *   A plain fetch() returns an empty skeleton; Playwright runs JS and gives us real content.
 * - page.evaluate() runs JS *inside* the browser — so we use the same logic as
 *   getCurrentPageContent() in the Tampermonkey script, just moved server-side.
 * - Result: same quality as running the extension manually in Chrome.
 */
import { chromium } from 'playwright';

const KW = {
  policy: ['политик','конфиденц','персональн','privacy','cookie','gdpr','согласие','persdata','personal-data','/policy','/policies'],
  offer:  ['оферт','договор','правила','усло','public-offer','соглашен','agreement','terms'],
  ret:    ['возврат','обмен','отказ'],
  about:  ['о компани','о нас','контакт','about','contact','реквизит'],
};

/**
 * Launches a headless browser, navigates to the URL, and extracts the same
 * fields that getCurrentPageContent() reads from the live DOM in Tampermonkey.
 *
 * @param {string} url
 * @param {{ timeout?: number }} options
 * @returns {Promise<object>} pageContent object expected by runAIAnalysis()
 */
export async function buildPageContext(url, { timeout = 20000 } = {}) {
  const browser = await chromium.launch({ headless: true });
  try {
    // Set userAgent and locale via context (page.setUserAgent removed in Playwright 1.x)
    const browserCtx = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      locale: 'ru-RU',
      extraHTTPHeaders: { 'Accept-Language': 'ru-RU,ru;q=0.9,en;q=0.8' },
    });
    const page = await browserCtx.newPage();

    await page.goto(url, { waitUntil: 'load', timeout });

    // Wait for JS hydration (React/Vue), and for any post-load redirects to settle
    await page.waitForTimeout(2000);

    // Run the same extraction logic as getCurrentPageContent() — inside the real browser
    const context = await page.evaluate((kw) => {
      const matchesKw = (text, kws) => {
        const t = (text || '').toLowerCase();
        return kws.some(k => t.includes(k));
      };

      const links = Array.from(document.querySelectorAll('a[href]'))
        .map(a => ({
          text: (a.innerText || a.textContent || '').trim().slice(0, 80),
          href: a.href,
          path: (() => { try { return new URL(a.href).pathname.toLowerCase(); } catch { return ''; } })(),
        }))
        .filter(l => l.text && l.href.startsWith(location.origin));

      const seen = new Set();
      const uniqueLinks = links.filter(l => seen.has(l.href) ? false : (seen.add(l.href), true));

      const headerEl = document.querySelector('header,#header,.header');
      const footerEl = document.querySelector('footer,#footer,.footer');

      const m = (l, kws) => matchesKw(l.text + ' ' + l.path, kws);

      // Detect tracking/ad scripts — same list as Tampermonkey script
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

      return {
        url: location.href,
        title: document.title || '',
        header: headerEl ? headerEl.innerText.slice(0, 500) : '',
        footer: footerEl ? footerEl.innerText.slice(0, 800) : '',
        bodyText: document.body.innerText.slice(0, 8000),
        links: uniqueLinks.slice(0, 40),
        policyLinks: uniqueLinks.filter(l => m(l, kw.policy)).slice(0, 2),
        offerLinks:  uniqueLinks.filter(l => m(l, kw.offer)).slice(0, 2),
        returnLinks: uniqueLinks.filter(l => m(l, kw.ret)).slice(0, 2),
        aboutLinks:  uniqueLinks.filter(l => m(l, kw.about)).slice(0, 2),
        hasAdScripts:    document.querySelectorAll(adScriptSelectors).length > 0,
        hasCookieBanner: document.querySelectorAll(cookieBannerSelectors).length > 0,
      };
    }, KW);

    return context;
  } finally {
    await browser.close();
  }
}
