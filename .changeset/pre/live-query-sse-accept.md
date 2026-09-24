---
'@sveltejs/kit': patch
---

fix: send an explicit SSE Accept header for `query.live` requests to avoid buffering by proxies
