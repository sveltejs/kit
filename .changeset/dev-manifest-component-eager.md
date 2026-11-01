---
'@sveltejs/kit': patch
---

fix: start loading node components eagerly in dev to avoid 500 errors on in-flight requests during server module reloads
