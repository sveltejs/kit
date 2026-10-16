---
'@sveltejs/adapter-cloudflare': major
---

feat: build Cloudflare Workers using the Cloudflare Vite plugin in SvelteKit's existing server build and run `vite preview` in workerd

Remove `main` and `assets.directory` from Wrangler configuration; the adapter manages the Worker entry and deployment output and generates the configuration used by `wrangler deploy`.


