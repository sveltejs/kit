---
'@sveltejs/kit': patch
---

fix: exclude deleted cookies from `cookies.getAll()` so it stays consistent with `cookies.get()`
