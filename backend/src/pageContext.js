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
  policy: [
    'политик','конфиденц','персональн','положени','согласие на обработку','privacy','cookie','gdpr','согласие','persdata','personal-data','/policy','/policies',
    'privacy policy','data protection','data privacy','personal data','cookie policy','cookie notice','privacy notice',
    'personal_data','privacy_policy','personaldata',
    'обработка данных','защита данных','условия использования','пользовательское',
  ],
  offer: [
    'оферт','договор','правила','усло','public-offer','соглашен','agreement','terms',
    'terms of service','terms of use','terms and conditions','license agreement','service agreement','eula',
    'лицензионное','лицензия',
  ],
  ret:   ['возврат','обмен','отказ'],
  about: [
    'о компани','о нас','контакт','about','contact','реквизит',
    'legal notice','imprint','юридическ','юрлицо',
  ],
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
export async function buildPageContext(url, { timeout = 30000 } = {}) {
  const browser = await getBrowser();
  const browserCtx = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    locale: 'ru-RU',
    extraHTTPHeaders: { 'Accept-Language': 'ru-RU,ru;q=0.9,en;q=0.8' },
    ignoreHTTPSErrors: true,
  });
  try {
    const page = await browserCtx.newPage();

    // domcontentloaded is much more reliable than 'load' — avoids timeouts on
    // sites with heavy third-party resources (ads, analytics, large images).
    // JS hydration wait below compensates for React/Vue late rendering.
    const gotoResponse = await page.goto(url, { waitUntil: 'domcontentloaded', timeout });

    // Wait for JS hydration (React/Vue), and for any post-load redirects to settle
    await page.waitForTimeout(2000);

    // Scroll slightly to trigger lazy-loaded cookie banners (some appear only on scroll)
    await page.evaluate(() => window.scrollTo(0, 400));
    await page.waitForTimeout(600);

    // Try to dismiss cookie banner so it doesn't pollute bodyText
    try {
      await page.evaluate(() => {
        const ACCEPT = [
          // Named consent managers (most specific — try first)
          '#onetrust-accept-btn-handler',
          'button.onetrust-close-btn-ui',
          '#CybotCookiebotDialogBodyButtonAccept',
          'a#CybotCookiebotDialogBodyLevelButtonLevelOptinAllowAll',
          '.axeptio_btn_acceptAll',
          'button[data-testid="uc-accept-all-button"]',
          // Generic patterns
          '[class*="cookie"] button[class*="accept"]',
          '[id*="cookie"] button[class*="accept"]',
          '[class*="cookie-banner"] button', '[class*="cookie-notice"] button',
          '[class*="gdpr"] button[class*="accept"]',
          '[class*="consent"] button[class*="accept"]',
          'button[aria-label*="Accept"], button[aria-label*="Принять"]',
          '#cookie-accept, .cookie-accept, .js-cookie-accept',
          '[data-testid*="cookie"] button',
          'button[id*="accept"]', 'button[id*="agree"]',
        ];
        for (const sel of ACCEPT) {
          const btn = document.querySelector(sel);
          if (btn) { btn.click(); return; }
        }
        // Text-based fallback: find a button with "принять" or "согласен"
        for (const btn of document.querySelectorAll('button')) {
          const t = (btn.innerText || '').toLowerCase();
          if (/принять|согласен|accept all|ok/.test(t) && btn.offsetParent !== null) {
            btn.click(); return;
          }
        }
      });
      await page.waitForTimeout(400);
    } catch (_) {}

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

      // Analytics scripts — user tracking but NOT advertising; ERIR does NOT apply
      const analyticsScriptSelectors = [
        'script[src*="mc.yandex"]','script[src*="metrika"]',
        'script[src*="google-analytics"]','script[src*="gtag"]',
        'script[src*="top.mail.ru"]','script[src*="hotjar"]',
        'script[src*="roistat"]','script[src*="mindbox"]',
        'script[src*="carrotquest"]','script[src*="jivosite"]',
      ].join(',');

      // Ad network scripts — actual advertising placement; ERIR marking required
      // GTM is excluded: it's used by most sites for analytics only; tracked separately via hasGtm
      const adNetworkScriptSelectors = [
        'script[src*="an.yandex"]','script[src*="yandex-ads"]','script[src*="adfox"]',
        'script[src*="facebook.net"]',

        'script[src*="soloway"]','script[src*="buzzoola"]',
        'script[src*="otm-r.com"]','script[src*="mail.ru/counter"]',
        'script[src*="adriver.ru"]',
        'script[src*="begun.ru"]',
        'script[src*="smi2.ru"]',
        'script[src*="relap.io"]',
        'script[src*="recreativ.ru"]',
        'script[src*="segmento.net"]',
        'script[src*="criteo.net"]',
        'script[src*="doubleclick.net"]',
        'script[src*="adnxs.com"]',
      ].join(',');

      const gtmSelector = 'script[src*="googletagmanager"]';

      const adScriptSelectors = adNetworkScriptSelectors; // keep variable name for compatibility

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
      const COMPLIANCE_IN_PATH = /privac|polic|personal.?data|personal_data|privacy_pol|конфиденц|персональн|gdpr|ofert|terms|legal|cookie|protect|privacypol|persdat/i;
      const isContentPath = p =>
        !COMPLIANCE_IN_PATH.test(p) &&
        /\/\d{4}\/\d{2}[/\-]|\/(news|article|review|blog|post|video|forum)\//i.test(p);

      // A1: for compliance pages give more body text; cap at 25k instead of 10k
      const isCompliancePage = /polic|privacy|personal|ofert|конфиденц|персон|оферт|cookie|gdpr/i.test(location.pathname + location.href);
      const bodyText = (() => {
        const t = document.body.innerText;
        const cap = isCompliancePage ? 25000 : 10000;
        if (t.length <= cap) return t;
        return t.slice(0, cap - 2000) + '\n' + t.slice(-2000);
      })();

      // A4: РКН требует ссылку на политику в footer на каждой странице с формой.
      // null = нет footer-элемента (неизвестно); false = footer есть, ссылки нет; true = ссылка есть.
      const hasPolicyFooterLink = (() => {
        if (!footerEl) return null;
        const html = footerEl.innerHTML || '';
        return /пол[ие]тик|конфиденц|privacy|personal.?data|персональн/i.test(html);
      })();

      // A5: наличие checkbox согласия на обработку ПД в формах
      const hasConsentCheckbox = (() => {
        const checkboxSels = [
          'input[type="checkbox"][name*="agree"]',
          'input[type="checkbox"][name*="consent"]',
          'input[type="checkbox"][name*="personal"]',
          'input[type="checkbox"][id*="agree"]',
          'input[type="checkbox"][id*="consent"]',
        ].join(',');
        if (document.querySelector(checkboxSels)) return true;
        const labels = Array.from(document.querySelectorAll('label')).map(l => l.textContent).join(' ');
        return /соглас[еёаюяшь]|персональн|обработ[еёаку]/i.test(labels);
      })();

      return {
        url: location.href,
        title: (document.title || '').replace(/<[^>]+>/g, '').trim(),
        header: headerEl ? headerEl.innerText.slice(0, 500) : '',
        footer: footerEl ? (footerEl.innerText + ' ' + footerImgAlt).slice(0, 1200) : '',
        bodyText,
        jsonLdText,
        eridAttrs,
        links: uniqueLinks.slice(0, 40),
        policyLinks: uniqueLinks.filter(l => {
          if (isContentPath(l.path)) return false;
          if (!m(l, kw.policy)) return false;
          if (/антикоррупцион|политика.качеств|охран[аы].труда|экологичес|информацион[нг].+безопасн/i.test(l.text)) return false;
          // "персональн" alone is too broad — only allow if paired with data/privacy context
          // (filters out "Персональная доработка", "Персональный менеджер" etc.)
          if (/персональн/i.test(l.text) && !/данн|обработк|конфиденц|privacy|personal.?data/i.test(l.text + l.href)) return false;
          return true;
        }).slice(0, 5),
        offerLinks:  uniqueLinks.filter(l => !isContentPath(l.path) && m(l, kw.offer)).slice(0, 4),
        returnLinks: uniqueLinks.filter(l => !isContentPath(l.path) && m(l, kw.ret)).slice(0, 3),
        aboutLinks:  uniqueLinks.filter(l => !isContentPath(l.path) && m(l, kw.about)).slice(0, 4),
        hasAdScripts:       document.querySelectorAll(adNetworkScriptSelectors).length > 0,
        hasGtm:             document.querySelectorAll(gtmSelector).length > 0,
        hasAnalytics:       document.querySelectorAll(analyticsScriptSelectors).length > 0,
        hasCookieBanner:    document.querySelectorAll(cookieBannerSelectors).length > 0 || hasCookieBannerByText,
        hasPolicyFooterLink,
        hasConsentCheckbox,
      };
    }, KW);

    const httpStatus = gotoResponse?.status?.() ?? 200;
    if (httpStatus === 403) context._http403 = true;

    // Detect anti-bot challenge pages (Cloudflare, DDoS-Guard, etc.)
    // They render a short JS challenge that never gives us real content.
    const isChallenge = context.bodyText.length < 300 && (
      /just a moment|почти готово|проверка браузера|checking your browser|ddos.guard|enable javascript/i.test(context.title + ' ' + context.bodyText)
    );
    if (isChallenge) {
      // Fall through to plain-fetch fallback below
      throw new Error(`challenge:${context.title}`);
    }

    // If no policy links found, try clicking policy-text buttons (modal popups, SPAs).
    // Some sites (e.g. Nuxt.js застройщики) place privacy policy behind a <BUTTON>
    // with no href — standard link extraction misses it entirely.
    context.inlineModalPolicyText = '';
    if (!context.policyLinks?.length) {
      try {
        const marked = await page.evaluate(() => {
          const policyRe = /политик|конфиденц|персональн|privacy|personal.?data/i;
          const sel = 'button, a[href="#"], a[href="javascript:void(0)"], a[href="javascript:;"], a:not([href])';
          for (const el of document.querySelectorAll(sel)) {
            const text = (el.innerText || el.textContent || '').trim();
            if (policyRe.test(text) && text.length > 3 && text.length < 80) {
              el.setAttribute('data-sleza-policy-click', '1');
              return true;
            }
          }
          return false;
        });
        if (marked) {
          await page.click('[data-sleza-policy-click]', { timeout: 3000 });
          await page.waitForTimeout(1500);
          context.inlineModalPolicyText = await page.evaluate(() => {
            const sels = [
              '[role="dialog"]', '[role="alertdialog"]',
              '[class*="modal"]', '[class*="overlay"]', '[class*="popup"]',
              '[class*="dialog"]', '[class*="sheet"]', '[class*="drawer"]',
            ];
            for (const sel of sels) {
              try {
                const el = document.querySelector(sel);
                const text = (el?.innerText || '').trim();
                if (text.length > 200) return text.slice(0, 20000);
              } catch (_) {}
            }
            // Fallback: position:fixed/absolute element with high z-index and substantial text
            const candidates = Array.from(document.querySelectorAll('div,section,article'))
              .filter(el => {
                try {
                  const s = window.getComputedStyle(el);
                  return (s.position === 'fixed' || s.position === 'absolute') &&
                    parseInt(s.zIndex || '0') > 50 && el.offsetHeight > 100 &&
                    (el.innerText || '').length > 200;
                } catch { return false; }
              });
            if (candidates.length) {
              candidates.sort((a, b) => (b.innerText || '').length - (a.innerText || '').length);
              return (candidates[0].innerText || '').slice(0, 20000);
            }
            return '';
          });
        }
      } catch (_) {}
    }

    return context;
  } catch (err) {
    // Playwright failed (timeout, network block, SSL, challenge) — fall back to plain fetch.
    // We get less data (no JS rendering, no link extraction) but at least basic text.
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
        signal: AbortSignal.timeout(10000),
        redirect: 'follow',
      });
      const ct = res.headers.get('content-type') || '';
      const charset = (ct.match(/charset=([^\s;]+)/i)?.[1] || 'utf-8').toLowerCase();
      let html;
      if (/windows-1251|cp1251|koi8/.test(charset)) {
        html = new TextDecoder(charset).decode(await res.arrayBuffer());
      } else {
        html = await res.text();
      }
      const text = html
        .replace(/<script[\s\S]*?<\/script>/gi, ' ')
        .replace(/<style[\s\S]*?<\/style>/gi, ' ')
        .replace(/<[^>]+>/g, ' ')
        .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
        .replace(/\s{2,}/g, ' ').trim();
      const titleM = html.match(/<title[^>]*>([^<]*)<\/title>/i);
      return {
        url, title: titleM?.[1]?.trim() || '', header: '', footer: '',
        bodyText: text.slice(0, 10000), jsonLdText: '', eridAttrs: '',
        links: [], policyLinks: [], offerLinks: [], returnLinks: [], aboutLinks: [],
        hasAdScripts: false, hasAnalytics: false, hasCookieBanner: false,
        hasPolicyFooterLink: false, hasConsentCheckbox: false, inlineModalPolicyText: '',
        _fallback: true,
        _blocked: /^challenge:/.test(String(err?.message)),
        _http403: res.status === 403,
      };
    } catch {
      throw err; // rethrow original Playwright error
    }
  } finally {
    await browserCtx.close();
  }
}
