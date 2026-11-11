// GET /api/auth/callback/facebook|tiktok  (the redirect_uri registered in each developer console)
// Exchanges the code (needs the app secret → stays on the server), then hands tokens to the app
// inside a short-lived encrypted blob via the qvmauth:// deep link.
const { seal, unseal, redirectUri, fbVer, backToApp, errorPage } = require('../../_lib');

async function j(url, opts) {
  const r = await fetch(url, opts);
  const t = await r.text();
  let d; try { d = JSON.parse(t); } catch { d = { raw: t }; }
  if (!r.ok) throw new Error((d.error && (d.error.message || d.error)) || d.error_description || ('HTTP ' + r.status));
  return d;
}

async function facebook(code) {
  const G = `https://graph.facebook.com/${fbVer()}`;
  const short = await j(`${G}/oauth/access_token?` + new URLSearchParams({
    client_id: process.env.FB_APP_ID, client_secret: process.env.FB_APP_SECRET,
    redirect_uri: redirectUri('facebook'), code }));
  const long = await j(`${G}/oauth/access_token?` + new URLSearchParams({
    grant_type: 'fb_exchange_token', client_id: process.env.FB_APP_ID,
    client_secret: process.env.FB_APP_SECRET, fb_exchange_token: short.access_token }));
  // Page tokens obtained with a long-lived user token do not expire.
  const acc = await j(`${G}/me/accounts?` + new URLSearchParams({
    fields: 'id,name,access_token,tasks', limit: '50', access_token: long.access_token }));
  const pages = (acc.data || [])
    .filter(p => !p.tasks || p.tasks.includes('CREATE_CONTENT') || p.tasks.includes('MANAGE'))
    .slice(0, 20)
    .map(p => ({ id: p.id, name: p.name, token: p.access_token }));
  if (!pages.length) throw new Error('Is account par koi Facebook Page nahi mili (ya Page par content banane ki ijazat nahi).');
  return { pages };
}

async function tiktok(code) {
  const d = await j('https://open.tiktokapis.com/v2/oauth/token/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Cache-Control': 'no-cache' },
    body: new URLSearchParams({
      client_key: process.env.TT_CLIENT_KEY, client_secret: process.env.TT_CLIENT_SECRET,
      code, grant_type: 'authorization_code', redirect_uri: redirectUri('tiktok') }),
  });
  if (!d.access_token) throw new Error(d.error_description || d.error || 'TikTok token nahi mila');
  return {
    access_token: d.access_token, refresh_token: d.refresh_token, open_id: d.open_id,
    expires_in: d.expires_in, refresh_expires_in: d.refresh_expires_in, scope: d.scope,
  };
}

module.exports = async (req, res) => {
  const platform = req.query.platform;
  const { code, state, error, error_description } = req.query;
  let st;
  try { st = unseal(state); } catch { return errorPage(res, 'Session invalid — app se dobara login karein.'); }
  if (st.p !== platform || Date.now() - st.t > 10 * 60 * 1000) return errorPage(res, 'Session expire ho gayi — dobara login karein.');

  if (error || !code) {
    return backToApp(res, `error=${encodeURIComponent(error_description || error || 'cancelled')}&n=${encodeURIComponent(st.n)}`);
  }
  try {
    const data = platform === 'facebook' ? await facebook(code) : await tiktok(code);
    const blob = seal({ p: platform, n: st.n, d: data, exp: Date.now() + 120000 });
    backToApp(res, `blob=${blob}`);
  } catch (e) {
    backToApp(res, `error=${encodeURIComponent(String(e.message).slice(0, 300))}&n=${encodeURIComponent(st.n)}`);
  }
};
