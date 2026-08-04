---
'@sveltejs/kit': patch
---

fix: write generated tsconfig to `node_modules/$app/tsconfig.json` so that tools with simplified tsconfig resolution can find it
