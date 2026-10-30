---
'@sveltejs/adapter-cloudflare': patch
---

fix: apply the environment config from `@cloudflare/vite-plugin` during dev and build so that dependencies resolve the same way as in workerd and CommonJS `require` calls of Node builtins work
