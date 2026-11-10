---
'@sveltejs/kit': patch
---

fix: throw in dev when `query`, `query.batch` or `query.live` is called while rendering a prerendered page, as the build does
