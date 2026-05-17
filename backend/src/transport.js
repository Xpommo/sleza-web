/**
 * fetch-based HTTP transport replacing GM_xmlhttpRequest for server-side use.
 * The scan engine calls setHttpTransport(makeFetchTransport()) — after that
 * all outbound HTTP goes through native fetch instead of Tampermonkey's API.
 */
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
        const responseText = await res.text();
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
