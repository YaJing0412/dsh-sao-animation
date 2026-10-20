/**
 * dsh-sao-animation — host half.
 *
 * Owns three things:
 *   · the animation asset itself (/dsh-boot/animation.html)
 *   · the settings document (/dsh-boot/config), persisted in $DSH_HOME
 *   · an optional legacy injection row for shells that never load client modules
 *
 * The UI (splash + settings page) lives in ./client.js and is loaded by the
 * Harness client module graph via package.json's `dsh.client` declaration.
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DSH_HOME = process.env.DSH_HOME || path.join(os.homedir(), '.dsh');
const CFG_FILE = path.join(DSH_HOME, 'dsh-sao-animation.json');
/* settings written before the rename still count */
const LEGACY_CFG_FILE = path.join(DSH_HOME, 'dsh-boot-animation.json');
const ANIM_FILE = path.join(ROOT, 'assets', 'animation.html');
const DOM_CLIENT = path.join(ROOT, 'lib', 'client-dom.js');

/** Every copy string the animation can show. Keep in sync with lib/client.js FIELDS. */
export const TEXT_KEYS = [
  'linkBig', 'linkMono', 'connect', 'connectMono',
  'chipA', 'chipB', 'chipC', 'chipD',
  'pillLeft', 'pillRight',
  'loginTitle', 'fieldA', 'fieldB',
  'tagline', 'skipLabel',
];

export const STYLE_KEYS = [
  'linkBig', 'linkMono', 'connect', 'connectMono',
  'chipA', 'chipB',
  'pillLeft', 'pillRight',
  'loginTitle', 'fieldA', 'fieldB',
  'tagline', 'skipLabel',
];

export const DEFAULTS = {
  enabled: true,
  audio: true,
  skipKey: 'Escape',
  texts: {
    linkBig: 'LINK START',
    linkMono: 'neural link \u00b7 deepseek harness',
    connect: '\u5f00\u59cb\u8fde\u63a5',
    connectMono: 'establishing link \u00b7 dsh://local \u00b7 handshake',
    chipA: 'OK',
    chipB: 'reasoning',
    chipC: 'context',
    chipD: 'tools',
    pillLeft: 'Language',
    pillRight: 'DeepSeek',
    loginTitle: 'Log in_',
    fieldA: ':account',
    fieldB: ':api key',
    tagline: 'Everything is a Plugin',
    skipLabel: '\u70b9\u51fb\u8df3\u8fc7 / SKIP',
  },
  styles: {
    linkBig: { size: 32, color: '#eef2f8' },
    linkMono: { size: 12, color: '#9aa4b2' },
    connect: { size: 27, color: '#f2f3f5' },
    connectMono: { size: 12, color: '#8d949f' },
    chipA: { size: 19, color: '#134c56' },
    chipB: { size: 19, color: '#134c56' },
    pillLeft: { size: 25, color: '#ffffff' },
    pillRight: { size: 25, color: '#0b3b44' },
    loginTitle: { size: 32, color: '#ffffff' },
    fieldA: { size: 17, color: '#dff6fb' },
    fieldB: { size: 17, color: '#dff6fb' },
    tagline: { size: 13, color: '#9aa1ad' },
    skipLabel: { size: 12, color: '#cfd6e2' },
  },
};

function defaults() {
  return JSON.parse(JSON.stringify(DEFAULTS));
}

function sanitize(input) {
  const out = defaults();
  if (!input || typeof input !== 'object') return out;
  if (typeof input.enabled === 'boolean') out.enabled = input.enabled;
  if (typeof input.audio === 'boolean') out.audio = input.audio;
  if (typeof input.skipKey === 'string') {
    const k = input.skipKey.trim();
    if (k && k.length <= 40 && /^[A-Za-z0-9+ -]+$/.test(k)) out.skipKey = k;
  }
  const st = input.styles && typeof input.styles === 'object' ? input.styles : {};
  for (const key of STYLE_KEYS) {
    const v = st[key];
    if (!v || typeof v !== 'object') continue;
    const spec = {};
    const size = Number(v.size);
    if (Number.isFinite(size) && size >= 6 && size <= 200) spec.size = Math.round(size * 10) / 10;
    if (typeof v.color === 'string' && /^#[0-9a-fA-F]{3,8}$/.test(v.color.trim())) spec.color = v.color.trim();
    if (Object.keys(spec).length) out.styles[key] = spec;
  }

  const tx = input.texts && typeof input.texts === 'object' ? input.texts : {};
  for (const key of TEXT_KEYS) {
    const v = tx[key];
    if (typeof v !== 'string') continue;
    const s = v.replace(/[\r\n\t]+/g, ' ').slice(0, 200);
    if (s.trim().length) out.texts[key] = s;
  }
  return out;
}

function readConfig() {
  for (const file of [CFG_FILE, LEGACY_CFG_FILE]) {
    try {
      return sanitize(JSON.parse(fs.readFileSync(file, 'utf8')));
    } catch (err) { /* try the next candidate */ }
  }
  return defaults();
}

function writeConfig(next) {
  const cfg = sanitize(next);
  try {
    fs.mkdirSync(DSH_HOME, { recursive: true });
    fs.writeFileSync(CFG_FILE, JSON.stringify(cfg, null, 2) + '\n', 'utf8');
    return { ok: true, config: cfg };
  } catch (err) {
    return { ok: false, error: String((err && err.message) || err), config: cfg };
  }
}

function send(res, status, type, body) {
  res.writeHead(status, { 'Content-Type': type, 'Cache-Control': 'no-store' });
  res.end(body);
}

function readBody(req, limit) {
  return new Promise((resolve) => {
    let size = 0;
    const chunks = [];
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > limit) {
        try { req.destroy(); } catch (err) {}
        resolve(null);
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      try { resolve(Buffer.concat(chunks).toString('utf8')); } catch (err) { resolve(null); }
    });
    req.on('error', () => resolve(null));
  });
}

/** Legacy row for shells that read index.html from disk and never run client modules. */
const BOOTSTRAP =
  '(function(){try{if(window.__dsBootAnimLoad)return;window.__dsBootAnimLoad=1;'
  + 'var d=document.body||document.head||document.documentElement;if(!d)return;'
  + 'var s=document.createElement("script");s.src="/dsh-boot/client-dom.js";s.defer=true;'
  + 's.onerror=function(){};d.appendChild(s)}catch(e){}})()';

export default {
  name: 'dsh-sao-animation',

  apply(root, config) {
    const cfg = config || {};
    /* The desktop shell serves the page from dsh-app://app/ and never injects
       __DSH_BOOT__, so a plain script is the only UI channel there. Inject by
       default; the script itself bails out on shells that do run client modules. */
    const legacyInject = cfg.injectScript !== false;

    if (legacyInject) {
      root.on('webserver/index-inject', (table) => {
        try {
          if (!Array.isArray(table)) return;
          for (const row of table) {
            if (!row) continue;
            if (row.kind === 'script' && typeof row.text === 'string'
              && row.text.indexOf('/dsh-boot/client-dom.js') >= 0) return;
          }
          table.push({ kind: 'script', placement: 'body', text: BOOTSTRAP });
        } catch (err) {}
      });
    }

    root.inject(['webServer'], (ctx) => {
      const disposers = [];

      disposers.push(ctx.webServer.register({
        kind: 'exact',
        path: '/dsh-boot/animation.html',
        handler: (req, res) => {
          let body;
          try { body = fs.readFileSync(ANIM_FILE); } catch (err) {
            return send(res, 404, 'text/plain; charset=utf-8', 'not found');
          }
          send(res, 200, 'text/html; charset=utf-8', body);
        },
      }));

      disposers.push(ctx.webServer.register({
        kind: 'exact',
        path: '/dsh-boot/client-dom.js',
        handler: (req, res) => {
          let body;
          try { body = fs.readFileSync(DOM_CLIENT); } catch (err) {
            return send(res, 404, 'text/plain; charset=utf-8', 'not found');
          }
          send(res, 200, 'application/javascript; charset=utf-8', body);
        },
      }));

      disposers.push(ctx.webServer.register({
        kind: 'exact',
        path: '/dsh-boot/config',
        handler: async (req, res) => {
          if (req.method !== 'POST') {
            return send(res, 200, 'application/json; charset=utf-8', JSON.stringify(readConfig()));
          }
          const raw = await readBody(req, 64 * 1024);
          if (raw == null) return send(res, 413, 'application/json; charset=utf-8', '{"ok":false,"error":"too large"}');
          let parsed;
          try { parsed = JSON.parse(raw); } catch (err) {
            return send(res, 400, 'application/json; charset=utf-8', '{"ok":false,"error":"bad json"}');
          }
          const result = writeConfig(parsed);
          send(res, result.ok ? 200 : 500, 'application/json; charset=utf-8', JSON.stringify(result));
        },
      }));

      ctx.effect(() => () => {
        for (const d of disposers) { try { d(); } catch (err) {} }
      });
    });
  },
};
