---
'@sveltejs/kit': patch
---

fix: handle Node requests that were destroyed or cancelled before or while their body is read, including over HTTP/2
