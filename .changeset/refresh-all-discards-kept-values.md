---
'@sveltejs/kit': patch
---

fix: `refreshAll` discards values that were being kept for queries nothing is reading, so they are fetched again
