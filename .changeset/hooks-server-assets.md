---
'@sveltejs/kit': patch
---

fix: include `hooks.server` and `hooks.universal` as explicit Vite build inputs to ensure assets imported by hooks files are correctly discovered
