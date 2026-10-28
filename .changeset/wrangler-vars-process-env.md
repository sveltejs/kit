---
'@sveltejs/adapter-cloudflare': patch
---

fix: populate `process.env` with Wrangler `vars` and local `.dev.vars` / `.env` secrets during `vite dev` and `vite build`
