---
'@sveltejs/adapter-cloudflare': major
---

breaking: only copy `.dev.vars` values into `process.env` during `vite dev`, and only for `secret` bindings declared in `cloudflare.config.ts`, to match what the Worker receives
