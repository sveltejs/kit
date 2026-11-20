---
'@sveltejs/kit': patch
---

fix: keep a value that a command sets on a query until something reads it, instead of sometimes fetching it again
