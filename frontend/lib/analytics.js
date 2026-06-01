// Lightweight funnel analytics. Fire-and-forget — never throws, never blocks UX.
// UTM params are captured once per session and attached to every event so the
// backend funnel can break conversions down by traffic source.

const BASE = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';
const UTM_KEY = 'fnk_utm';
const UTM_FIELDS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'];

// Reads UTM params from the current URL and persists them for the session.
// Call once on app mount. Existing stored UTM is not overwritten by a param-less visit.
export function captureUTM() {
  if (typeof window === 'undefined') return;
  try {
    const params = new URLSearchParams(window.location.search);
    const utm = {};
    for (const f of UTM_FIELDS) {
      const v = params.get(f);
      if (v) utm[f] = v.slice(0, 120);
    }
    if (Object.keys(utm).length > 0) {
      sessionStorage.setItem(UTM_KEY, JSON.stringify(utm));
    }
  } catch { /* sessionStorage blocked — ignore */ }
}

function getUTM() {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(UTM_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

// Records a funnel step. Valid types are enforced server-side.
export function fireEvent(type, { scanUuid = null, hostname = null } = {}) {
  if (typeof window === 'undefined') return;
  try {
    fetch(`${BASE}/api/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, scan_uuid: scanUuid, hostname, utm: getUTM() }),
      keepalive: true,
    }).catch(() => {});
  } catch { /* ignore */ }
}
