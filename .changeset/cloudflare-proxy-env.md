---
'@sveltejs/adapter-cloudflare': patch
---

fix: use the Wrangler environment resolved from `CLOUDFLARE_ENV` in `.env` files for platform bindings during development
