/**
 * Loads the Tampermonkey scan core into a Node.js VM context,
 * wires up fetch transport and key storage, returns ready-to-use engine.
 *
 * Why VM context? The script is an IIFE that expects browser globals
 * (document, location, GM_*). We shim just enough to load it safely.
 * Same approach as tests/loadScript.js — already battle-tested.
 */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { makeFetchTransport } from './transport.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Priority: env var → bundled copy in repo → sibling repo (local dev)
const SCRIPT_PATH = process.env.SLEZA_SCRIPT_PATH || (() => {
  const bundled  = path.resolve(__dirname, '../sleza_script');
  const sibling  = path.resolve(__dirname, '../../../sleza_tets_js/script');
  return fs.existsSync(bundled) ? bundled : sibling;
})();

let _source = null;
async function readSource() {
  if (_source) return _source;
  if (fs.existsSync(SCRIPT_PATH)) {
    _source = fs.readFileSync(SCRIPT_PATH, 'utf8');
    return _source;
  }
  throw new Error(`Скрипт Sleza не найден: ${SCRIPT_PATH}`);
}

// Minimal DOM shim — just enough so the IIFE doesn't crash on startup.
// Render functions and document.querySelector are never called server-side.
function makeMinimalDocument() {
  const noop = () => null;
  const el = {
    style: {}, classList: { add: noop, remove: noop },
    appendChild: noop, addEventListener: noop,
    innerHTML: '', textContent: '',
  };
  return {
    body: { ...el, innerText: '', appendChild: noop },
    head: el,
    documentElement: el,
    createElement: () => el,
    createTextNode: t => ({ nodeType: 3, textContent: t }),
    getElementById: noop,
    querySelector: noop,
    querySelectorAll: () => [],
    addEventListener: noop,
    title: '',
    cookie: '',
    location: { href: '', origin: '', hostname: '', pathname: '/' },
  };
}

/**
 * Creates a scan engine for one request.
 * Each request gets its own VM context to avoid shared mutable state
 * (scanCancelled, SKIP_REASONS, etc.) leaking between concurrent scans.
 *
 * @param {{ groqKey: string, slezaKey: string }} keys
 * @returns {object} — all exported scan functions from module.exports
 */
export async function createEngine({ groqKey = '', slezaKey = '' } = {}) {
  const document = makeMinimalDocument();
  const location = document.location;

  const moduleObj = { exports: {} };
  // Prefix script logs with [script] so they can be filtered; avoid polluting scan output
  const scriptConsole = {
    log:   (...a) => process.env.SLEZA_DEBUG ? console.log('[script]', ...a) : undefined,
    warn:  (...a) => console.warn('[script]', ...a),
    error: (...a) => console.error('[script]', ...a),
  };
  const sandbox = {
    module: moduleObj,
    exports: moduleObj.exports,
    console: scriptConsole,
    setTimeout, clearTimeout, setInterval, clearInterval,
    Promise, Error, RegExp, JSON, Math, Date,
    URL, URLSearchParams,
    // GM_* shims — real values supplied via setKeyStore below
    GM_xmlhttpRequest: () => {},
    GM_addStyle: () => {},
    GM_getValue: (k, def) => def,
    GM_setValue: () => {},
    document,
    location,
    window: { location, document },
    DOMParser: class {
      parseFromString(html) {
        return {
          body: { textContent: String(html || '').replace(/<[^>]+>/g, ' ') },
          querySelector: () => null,
          querySelectorAll: () => [],
          documentElement: { outerHTML: String(html || '') },
        };
      }
    },
  };
  sandbox.globalThis = sandbox;
  sandbox.self = sandbox;

  const ctx = vm.createContext(sandbox);
  vm.runInContext(await readSource(), ctx, { filename: SCRIPT_PATH });

  const engine = moduleObj.exports;

  // Wire up fetch transport (replaces GM_xmlhttpRequest)
  engine.setHttpTransport(makeFetchTransport());

  // Wire up key storage (replaces GM_getValue / GM_setValue)
  engine.setKeyStore({
    get: (k, def) => {
      if (k === 'GROQ_KEY') return groqKey || def;
      if (k === 'SLEZA_KEY') return slezaKey || def;
      return def;
    },
    set: () => {},
  });

  // Sync keys into GROQ_KEY / SLEZA_KEY module variables
  engine.saveKeys(groqKey, slezaKey);

  return engine;
}
