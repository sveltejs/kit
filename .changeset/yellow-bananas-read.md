---
'@sveltejs/kit': patch
---

fix: remove reliance on Content-Length header in deserialize_binary_form, which caused failures when proxies (e.g. Vercel, Azure) strip the header and use chunked transfer encoding
