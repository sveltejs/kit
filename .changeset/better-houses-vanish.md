---
'@sveltejs/adapter-cloudflare': major
'@sveltejs/kit': minor
---

feat: build Cloudflare Workers with the Cloudflare Vite plugin and run `vite preview` in workerd, while retaining Node-based development

Remove `main` and `assets.directory` from Wrangler configuration; the adapter manages the Worker entry and deployment output and generates the configuration used by `wrangler deploy`.

Adapters can disable SvelteKit's Node preview server with `vite.preview: false` when providing their own preview implementation.


