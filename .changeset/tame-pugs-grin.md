---
'@sveltejs/kit': patch
---

fix: prevent unhandled promise rejections when remote function failures are consumed via `current`/`error` instead of `await`
