---
'@sveltejs/kit': patch
---

fix: validate `error` and `redirect` status codes even when kit is bundled with the `browser` export condition, as on Cloudflare Workers and Netlify edge functions
