---
'@sveltejs/kit': patch
---

fix: drain unconsumed request bodies so keep-alive connections don't hang
