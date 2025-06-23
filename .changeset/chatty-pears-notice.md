---
'@sveltejs/kit': patch
---

fix: prevent infinite loop when calling `pushState`/`replaceState` in `$effect`
