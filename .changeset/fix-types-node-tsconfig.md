---
'@sveltejs/kit': patch
---

fix: remove `types: ['node']` from generated tsconfig to avoid errors when `@types/node` is not installed
