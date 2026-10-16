---
'@sveltejs/adapter-cloudflare': major
---

feat: build Cloudflare Workers with the Cloudflare Vite plugin and run `vite preview` in workerd

Remove `main` and `assets.directory` from Wrangler configuration; the adapter manages the Worker entry and deployment output and generates the configuration used by `wrangler deploy`.


