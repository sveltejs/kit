---
'@sveltejs/kit': patch
---

fix: serialize `query(...).set(...)`/`query(...).refresh()` values into the rendered HTML when called from within a query during SSR
