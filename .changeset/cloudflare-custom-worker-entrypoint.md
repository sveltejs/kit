---
'@sveltejs/adapter-cloudflare': minor
---

feat: support a custom Worker `entrypoint` that exports Durable Objects and other handlers, and calls SvelteKit with `fetch` from `@sveltejs/adapter-cloudflare/worker`. It runs in the same Worker as SvelteKit, during development too, so modules that both import are only loaded once
