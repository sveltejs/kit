---
'@sveltejs/adapter-cloudflare': patch
---

fix: build the server with the environment config from `@cloudflare/vite-plugin` so that CommonJS `require` calls of Node builtins work in workerd
