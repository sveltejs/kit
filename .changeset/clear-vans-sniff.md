---
'@sveltejs/kit': patch
---

fix: avoid hanging when `error()` is used while streaming promises from a server `load` function
