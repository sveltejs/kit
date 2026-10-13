---
'@sveltejs/adapter-cloudflare': patch
---

fix: start the dev server on runtimes such as Deno that define `caches` as a getter-only global
