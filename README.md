# QVM Social Auth Server (Vercel)

Chhota stateless helper: Facebook/TikTok ka **app secret** yahan rehta hai, APK mein nahi.
Videos is server se **nahi** guzarti — app seedha Facebook/TikTok ko upload karti hai.

## 1) Deploy
1. Is folder ko GitHub repo bana kar Vercel par import karein (ya `vercel --prod`).
2. Vercel → Settings → Environment Variables:

| Name | Value |
|---|---|
| `PUBLIC_URL` | deploy hone ke baad ka URL, jaise `https://qvm-auth.vercel.app` (aakhir mein `/` nahi) |
| `SEAL_KEY` | 32 random bytes base64: `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"` |
| `FB_APP_ID`, `FB_APP_SECRET` | Meta app se |
| `TT_CLIENT_KEY`, `TT_CLIENT_SECRET` | TikTok app se |
| `APP_SCHEME` | `qvmauth` (default; manifest mein bhi yehi hai) |

Env vars badalne ke baad **Redeploy** karein.

## 2) Facebook (Meta) app
1. developers.facebook.com → Create app → type **Business** (ya Other) → "Facebook Login for Business" / "Facebook Login" add karein.
2. Valid OAuth Redirect URI: `https://<PUBLIC_URL>/api/auth/callback/facebook`
3. Permissions: `pages_show_list`, `pages_read_engagement`, `pages_manage_posts`.
4. **Development mode mein** aap (app admin/developer/tester) apne **apne Pages** par bina App Review ke upload kar sakte hain. Dusron ke Pages ke liye App Review + Business Verification chahiye.
5. Aap ka Facebook account us Page par content banane ki ijazat (task `CREATE_CONTENT`) rakhta ho.
6. Reels API limit: 30 API-published posts / 24 ghante.

## 3) TikTok app
1. developers.tiktok.com → Manage apps → Connect an app.
2. Products add karein: **Login Kit** (Redirect URI: `https://<PUBLIC_URL>/api/auth/callback/tiktok`) aur **Content Posting API**.
3. Scopes: `user.info.basic`, `video.upload` (Inbox/draft). Direct Post ke liye `video.publish` + Direct Post configuration — **TikTok app review/audit ke baad**; audit se pehle har direct post private hoti hai.
4. Development mode mein apna TikTok account **Target Users / Sandbox users** mein add karein.

## 4) Android app
- Publish dialog → ⚙ → is server ka URL daalein → Facebook/TikTok tab → login.
- Login browser mein hota hai, phir `qvmauth://auth` se app mein wapas aata hai.

## Endpoints
- `GET  /api/auth/start?p=facebook|tiktok&n=<nonce>&m=upload|publish`
- `GET  /api/auth/callback/[platform]`  (provider ka redirect URI)
- `POST /api/auth/open`  `{blob, n}` → tokens (blob 2 minute valid, nonce se bandha)
- `POST /api/tiktok/refresh`  `{refresh_token}`
