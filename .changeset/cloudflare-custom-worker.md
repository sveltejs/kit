---
'@sveltejs/adapter-cloudflare': minor
---

feat: support a custom Worker `entrypoint` that exports Durable Objects and other handlers, and calls SvelteKit with `fetch` from `@sveltejs/adapter-cloudflare/worker`. During development, it runs in workerd in front of SvelteKit
