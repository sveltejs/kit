---
'@sveltejs/adapter-cloudflare': major
---

breaking: throw when the Worker `entrypoint` in `cloudflare.config.ts` points to the old `.svelte-kit/cloudflare` Worker and warn that any other `entrypoint` is ignored
