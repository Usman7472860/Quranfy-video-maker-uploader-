// GET /api/auth/start?p=facebook|tiktok&n=<app nonce>&m=upload|publish
// Opened in the phone's browser by the app. Redirects to the provider's consent screen.
const { seal, redirectUri, fbVer, errorPage } = require('../_lib');

module.exports = (req, res) => {
  try {
    const { p, n, m } = req.query;
    if (!n || String(n).length < 16) return errorPage(res, 'bad nonce');
    const state = seal({ p, n, m: m || '', t: Date.now() });   // encrypted state = CSRF protection

    let url;
    if (p === 'facebook') {
      const q = new URLSearchParams({
        client_id: process.env.FB_APP_ID,
        redirect_uri: redirectUri('facebook'),
        state,
        response_type: 'code',
        scope: 'pages_show_list,pages_read_engagement,pages_manage_posts',
      });
      url = `https://www.facebook.com/${fbVer()}/dialog/oauth?${q}`;
    } else if (p === 'tiktok') {
      const scope = m === 'publish' ? 'user.info.basic,video.publish,video.upload' : 'user.info.basic,video.upload';
      const q = new URLSearchParams({
        client_key: process.env.TT_CLIENT_KEY,
        scope,
        response_type: 'code',
        redirect_uri: redirectUri('tiktok'),
        state,
      });
      url = `https://www.tiktok.com/v2/auth/authorize/?${q}`;
    } else {
      return errorPage(res, 'unknown platform');
    }
    res.redirect(302, url);
  } catch (e) {
    errorPage(res, 'server config error: ' + e.message);
  }
};
