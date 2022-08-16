---
'@sveltejs/kit': patch
---

[fix] prevent `Content-Length` header from being incorrectly inherited by requests made from `load`'s `fetch` during SSR
