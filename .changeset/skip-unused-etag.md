---
'@sveltejs/kit': patch
---

perf: skip hashing a page for its `ETag` when `setHeaders` already sets one or the response is `no-store`, and hash faster otherwise
