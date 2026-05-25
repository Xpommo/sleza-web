// Block SSRF: only allow public http/https URLs (no RFC-1918, loopback, link-local)
export function isSafeUrl(raw) {
  let parsed;
  try { parsed = new URL(raw); } catch { return false; }
  if (!['http:', 'https:'].includes(parsed.protocol)) return false;
  const host = parsed.hostname;
  if (host === 'localhost') return false;
  if (/^(127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|169\.254\.)/.test(host)) return false;
  return true;
}
