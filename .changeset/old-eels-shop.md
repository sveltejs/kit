---
'@sveltejs/kit': patch
---

fix: avoid externalising packages that depend on `@sveltejs/kit` so that libraries can also use `redirect` and `error` helpers
