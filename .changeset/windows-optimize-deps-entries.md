---
'@sveltejs/kit': patch
---

fix: find dependencies on Windows when Vite scans the routes at dev server startup, so pages are no longer reloaded as dependencies are discovered
