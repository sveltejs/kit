---
'@sveltejs/adapter-cloudflare': patch
---

fix: allow `env` from `cloudflare:workers` to be read at the top level of a server module during `vite build`
