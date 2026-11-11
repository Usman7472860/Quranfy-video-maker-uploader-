// Shared helpers. Files starting with "_" are NOT exposed as endpoints by Vercel.
const crypto = require('crypto');

function key() {
  const k = Buffer.from(process.env.SEAL_KEY || '', 'base64');
  if (k.length !== 32) throw new Error('SEAL_KEY must be 32 random bytes, base64 encoded');
  return k;
}

/** AES-256-GCM: authenticated + encrypted, url-safe. Used for OAuth `state` and for the one-shot token hand-off blob. */
function seal(obj) {
  const iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv('aes-256-gcm', key(), iv);
  const ct = Buffer.concat([c.update(JSON.stringify(obj), 'utf8'), c.final()]);
  return Buffer.concat([iv, c.getAuthTag(), ct]).toString('base64url');
}
function unseal(s) {
  const raw = Buffer.from(String(s), 'base64url');
  if (raw.length < 29) throw new Error('bad blob');
  const d = crypto.createDecipheriv('aes-256-gcm', key(), raw.subarray(0, 12));
  d.setAuthTag(raw.subarray(12, 28));
  return JSON.parse(Buffer.concat([d.update(raw.subarray(28)), d.final()]).toString('utf8'));
}

const base = () => (process.env.PUBLIC_URL || '').replace(/\/$/, '');
const redirectUri = (platform) => `${base()}/api/auth/callback/${platform}`;
const scheme = () => process.env.APP_SCHEME || 'qvmauth';
const fbVer = () => process.env.FB_GRAPH_VERSION || 'v26.0';

/** HTML that hands control back to the Android app (custom-scheme deep link) with a visible fallback button. */
function backToApp(res, query) {
  const url = `${scheme()}://auth?${query}`;
  const safe = url.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.status(200).send(`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Wapas app mein</title>
<style>body{font-family:system-ui,sans-serif;background:#0f172a;color:#e2e8f0;display:flex;min-height:100vh;align-items:center;justify-content:center;margin:0}
.c{text-align:center;padding:24px}a{display:inline-block;margin-top:18px;padding:14px 26px;background:#10b981;color:#fff;border-radius:14px;text-decoration:none;font-weight:700}</style></head>
<body><div class="c"><h2>✅ Login mukammal</h2><p>App khul rahi hai…</p><a href="${safe}">App mein wapas jayein</a></div>
<script>setTimeout(function(){location.href=${JSON.stringify(url)}},300)</script></body></html>`);
}

function errorPage(res, msg) {
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.status(400).send(msg);
}

module.exports = { seal, unseal, redirectUri, scheme, fbVer, backToApp, errorPage };
