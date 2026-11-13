---
'@sveltejs/kit': patch
---

perf: skip the `ETag` hash for a page that has a CSP nonce in it, since no two responses are the same
