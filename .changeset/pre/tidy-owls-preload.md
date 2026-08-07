---
'@sveltejs/kit': major
---

breaking: `preloadCode` now takes a route ID (e.g. `/blog/[slug]`) instead of a pathname. Route IDs are not prefixed with `paths.base`
