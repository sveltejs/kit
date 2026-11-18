---
'@sveltejs/kit': patch
---

fix: evict a query from the cache as soon as its override is released, if nothing else is using it
