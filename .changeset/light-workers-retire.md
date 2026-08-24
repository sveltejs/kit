---
'@sveltejs/adapter-cloudflare': patch
---

fix: terminate the wrangler platform proxy via the new emulator `dispose` hook, so prerendering no longer leaks a running `workerd` process
