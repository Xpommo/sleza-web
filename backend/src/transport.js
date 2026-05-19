/**
 * fetch-based HTTP transport replacing GM_xmlhttpRequest for server-side use.
 * The scan engine calls setHttpTransport(makeFetchTransport()) — after that
 * all outbound HTTP goes through native fetch instead of Tampermonkey's API.
 */

// Decode response body respecting charset from Content-Type header.
// Node fetch's res.text() defaults to UTF-8 and silently garbles legacy
// Russian sites (Windows-1251, KOI8-R) that declare their charset correctly.
async function decodeResponse(res) {
  const ct = res.headers.get('content-type') || '';
  const m  = ct.match(/charset=([^\s;]+)/i);
  const charset = (m?.[1] || 'utf-8').toLowerCase().replace(/^"(.*)"$/, '$1');

  const needsManualDecode =
    charset === 'windows-1251' || charset === 'cp1251' || charset === 'win-1251' ||
    charset === 'koi8-r' || charset === 'koi8-u' || charset === 'iso-8859-5';

  if (!needsManualDecode) return res.text();

  const buf = await res.arrayBuffer();
  try {
    return new TextDecoder(charset).decode(buf);
  } catch {
    return new TextDecoder('utf-8', { fatal: false }).decode(buf);
  }
}

export function makeFetchTransport() {
  return function fetchTransport(req) {
    const controller = new AbortController();
    const timeoutMs = req.timeout || 30000;
    const timer = setTimeout(() => controller.abort('timeout'), timeoutMs);

    fetch(req.url, {
      method: req.method || 'GET',
      headers: req.headers,
      body: req.data ?? undefined,
      signal: controller.signal,
      redirect: 'follow',
    })
      .then(async res => {
        clearTimeout(timer);
        const responseText = await decodeResponse(res);
        req.onload?.({ status: res.status, responseText, finalUrl: res.url });
      })
      .catch(err => {
        clearTimeout(timer);
        if (err.name === 'AbortError' || String(err).includes('timeout')) {
          req.ontimeout?.({ error: 'timeout' });
        } else {
          req.onerror?.({ error: String(err) });
        }
      });

    return { abort: () => controller.abort('user') };
  };
}
