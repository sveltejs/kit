---
'@sveltejs/kit': patch
---

fix: address security advisory CVE-2023-29003 by including `text/plain` and `PUT`/`PATCH`/`DELETE` requests in set of blocked cross-origin requests for CSRF protection
