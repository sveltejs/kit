---
'@sveltejs/kit': patch
---

Don't overwrite ETAG header.

Now user can provide a custom ETAG header, which should be manually checked against the 'if-none-match' header.
