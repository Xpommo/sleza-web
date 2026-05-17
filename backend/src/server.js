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
    url:   { type: 'string', minLength: 4, maxLength: 2048 },
    useAI: { type: 'boolean' },
  },
};

app.post('/api/scan/single', { schema: { body: scanBodySchema } }, async (request, reply) => {
  const ip = request.ip;
  if (!checkRateLimit(ip)) {
    return reply.status(429).send({ error: 'Слишком много одновременных сканов с вашего IP. Подождите.' });
  }
  try {
    const { url, useAI = true } = request.body;
    const { groqKey, slezaKey } = extractKeys(request);
    const result = await scanSinglePage({ url, groqKey, slezaKey, useAI });
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
    const { url, useAI = true } = request.body;
    const { groqKey, slezaKey } = extractKeys(request);
    const result = await scanFullSite({
      url, groqKey, slezaKey, useAI,
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

app.get('/health', async () => ({ status: 'ok', time: new Date().toISOString() }));

try {
  await app.listen({ port: PORT, host: '0.0.0.0' });
  console.log(`Backend running on http://localhost:${PORT}`);
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
