---
'@sveltejs/kit': patch
---

fix: don't set a `null` `accept-language` header on internal `fetch` sub-requests when the incoming request has none
