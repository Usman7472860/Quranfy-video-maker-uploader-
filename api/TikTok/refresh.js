// POST /api/tiktok/refresh {refresh_token} → new TikTok tokens (needs client_secret, so it lives here)
module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  try {
    const rt = (req.body || {}).refresh_token;
    if (!rt || typeof rt !== 'string' || rt.length > 2000) return res.status(400).json({ error: 'bad refresh_token' });
    const r = await fetch('https://open.tiktokapis.com/v2/oauth/token/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Cache-Control': 'no-cache' },
      body: new URLSearchParams({
        client_key: process.env.TT_CLIENT_KEY, client_secret: process.env.TT_CLIENT_SECRET,
        grant_type: 'refresh_token', refresh_token: rt }),
    });
    const d = await r.json();
    if (!d.access_token) return res.status(400).json({ error: d.error_description || d.error || 'refresh failed' });
    res.status(200).json({
      access_token: d.access_token, refresh_token: d.refresh_token, open_id: d.open_id,
      expires_in: d.expires_in, refresh_expires_in: d.refresh_expires_in, scope: d.scope });
  } catch (e) {
    res.status(500).json({ error: 'server error' });
  }
};
