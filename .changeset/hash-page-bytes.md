---
'@sveltejs/kit': patch
---

perf: hash a page's encoded bytes for its `ETag` and send the same bytes as the body, and skip the hash when `setHeaders` already sets an `etag` or the response is `no-store`
