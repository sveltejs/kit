---
'@sveltejs/kit': patch
---

fix: populate `$app/env/*` dynamic variables in contexts that don't run the dev server, such as `vite-node`
