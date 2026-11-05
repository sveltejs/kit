---
'@sveltejs/kit': patch
---

fix: keep a page's `ETag` stable when the responses to `fetch` calls in `load` arrive in a different order
