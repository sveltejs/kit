---
'@sveltejs/adapter-cloudflare': patch
---

fix: populate `process.env` with Wrangler `vars` and local `.dev.vars` secrets during `vite dev` and `vite build`
