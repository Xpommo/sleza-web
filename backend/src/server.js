/**
 * Fastify HTTP server — entry point for the backend.
 *
 * Two endpoints:
 *   POST /api/scan/single  — check one page (fast, ~15-30 sec)
 *   POST /api/scan/full    — check whole site (slow, ~2-5 min)
 *
 * Keys (Groq, Sleza) come from the request headers — never stored server-side.
 * Rate limiting: max 3 concurrent scans per IP to prevent abuse.
 */
import Fastify from 'fastify';
import cors from '@fastify/cors';
import { scanSinglePage, scanFullSite } from './scanner.js';
import { closeBrowser } from './pageContext.js';

const PORT = Number(process.env.PORT) || 3001;
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || 'http://localhost:3000').split(',');

const app = Fastify({ logger: true });

// Allow requests from the Next.js frontend
await app.register(cors, {
  origin: ALLOWED_ORIGINS,
  methods: ['POST', 'GET', 'OPTIONS'],
});

// Simple in-memory rate limiter: max 3 concurrent scans per IP
const activeScans = new Map(); // ip → count
function checkRateLimit(ip) {
  const count = activeScans.get(ip) || 0;
  if (count >= 3) return false;
  activeScans.set(ip, count + 1);
  return true;
}
function releaseRateLimit(ip) {
  const count = activeScans.get(ip) || 1;
  if (count <= 1) activeScans.delete(ip);
  else activeScans.set(ip, count - 1);
}

// Extract keys from request headers — clients send their own API keys
function extractKeys(request) {
  return {
    groqKey:  request.headers['x-groq-key']  || process.env.DEFAULT_GROQ_KEY  || '',
    slezaKey: request.headers['x-sleza-key'] || process.env.DEFAULT_SLEZA_KEY || '',
  };
}

// Input validation schema
const scanBodySchema = {
  type: 'object',
  required: ['url'],
  properties: {
    url:      { type: 'string', minLength: 4, maxLength: 2048 },
    useAI:    { type: 'boolean' },
    siteType: { type: 'string', enum: ['auto', 'ecommerce', 'media', 'services', 'saas'] },
  },
};

app.post('/api/scan/single', { schema: { body: scanBodySchema } }, async (request, reply) => {
  const ip = request.ip;
  if (!checkRateLimit(ip)) {
    return reply.status(429).send({ error: 'Слишком много одновременных сканов с вашего IP. Подождите.' });
  }
  try {
    const { url, useAI = true, siteType = 'auto' } = request.body;
    const { groqKey, slezaKey } = extractKeys(request);
    const result = await scanSinglePage({ url, groqKey, slezaKey, useAI, siteType });
    return reply.send(result);
  } catch (err) {
    app.log.error(err);
    return reply.status(500).send({ error: String(err.message) });
  } finally {
    releaseRateLimit(ip);
  }
});

app.post('/api/scan/full', { schema: { body: scanBodySchema } }, async (request, reply) => {
  const ip = request.ip;
  if (!checkRateLimit(ip)) {
    return reply.status(429).send({ error: 'Слишком много одновременных сканов с вашего IP. Подождите.' });
  }
  try {
    const { url, useAI = true, siteType = 'auto' } = request.body;
    const { groqKey, slezaKey } = extractKeys(request);
    const result = await scanFullSite({
      url, groqKey, slezaKey, useAI, siteType,
      onProgress: p => app.log.info(p, 'scan progress'),
    });
    return reply.send(result);
  } catch (err) {
    app.log.error(err);
    return reply.status(500).send({ error: String(err.message) });
  } finally {
    releaseRateLimit(ip);
  }
});

// SSE endpoint for full site scan — streams progress events then final result.
// The browser opens this as a fetch with ReadableStream; no timeout issues.
app.post('/api/scan/full/stream', { schema: { body: scanBodySchema } }, async (request, reply) => {
  const ip = request.ip;
  if (!checkRateLimit(ip)) {
    return reply.status(429).send({ error: 'Слишком много одновременных сканов с вашего IP. Подождите.' });
  }

  const { url, useAI = true, siteType = 'auto' } = request.body;
  const { groqKey, slezaKey } = extractKeys(request);
  const origin = request.headers.origin || ALLOWED_ORIGINS[0];

  // Take raw control of the socket so we can stream SSE events
  reply.hijack();
  const res = reply.raw;
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Credentials': 'true',
  });

  const send = (data) => {
    try { res.write(`data: ${JSON.stringify(data)}\n\n`); } catch (_) {}
  };

  try {
    const result = await scanFullSite({
      url, groqKey, slezaKey, useAI, siteType,
      onProgress: (p) => send(p),
    });
    send({ done: true, result });
  } catch (err) {
    app.log.error(err);
    send({ error: String(err.message) });
  } finally {
    releaseRateLimit(ip);
    res.end();
  }
});

app.get('/health', async () => ({ status: 'ok', time: new Date().toISOString() }));

const shutdown = async () => {
  await closeBrowser();
  await app.close();
  process.exit(0);
};
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

try {
  await app.listen({ port: PORT, host: '0.0.0.0' });
  console.log(`Backend running on http://localhost:${PORT}`);
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
