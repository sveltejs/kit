---
'@sveltejs/kit': patch
---

fix: preserve multiple `Set-Cookie` headers on 304 responses

`Headers.get('set-cookie')` collapses multiple `Set-Cookie` values into a single
comma-joined string, which browsers cannot parse. The 304 response path now
iterates `Headers.getSetCookie()` and appends each cookie individually, so all
cookies survive when a request matches `If-None-Match`.
