---
'@sveltejs/kit': patch
---

fix: record prerendered paths the way the router decodes them, so percent signs and encoded reserved characters stay distinguishable
