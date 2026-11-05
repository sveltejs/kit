---
'@sveltejs/adapter-cloudflare': major
---

breaking: replace Wrangler with the Cloudflare Vite plugin v2. The Worker is configured with `cloudflare.config.ts` instead of a Wrangler configuration file, the `config` option is removed, the build output is written to `.cloudflare/output` for `cf deploy`, and bindings are emulated for the current Vite mode
