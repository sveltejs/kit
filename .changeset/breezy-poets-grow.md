---
'@sveltejs/kit': patch
---

fix: prevent error attempting to modify immutable headers by creating a new `Response` object
