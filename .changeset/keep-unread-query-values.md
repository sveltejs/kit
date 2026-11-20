---
'@sveltejs/kit': patch
---

fix: keep a value that a command sets on a query nothing is reading, so the next reader uses it without fetching again. The value is dropped if the next navigation finishes without reading it
