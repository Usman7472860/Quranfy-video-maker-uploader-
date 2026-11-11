// POST /api/auth/open  {blob, n}  → {platform, data}
// The app swaps the deep-link blob for the tokens. Blob lives 2 minutes and is bound to the app's nonce.
const { unseal } = require('../_lib');

module.exports = (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  try {
    const { blob, n } = req.body || {};
    const o = unseal(blob);
    if (!n || o.n !== n) return res.status(401).json({ error: 'nonce mismatch' });
    if (Date.now() > o.exp) return res.status(401).json({ error: 'expired' });
    res.status(200).json({ platform: o.p, data: o.d });
  } catch (e) {
    res.status(401).json({ error: 'invalid' });
  }
};
