---
'@sveltejs/kit': minor
---

feat: support caching of responses with `Vary` header (except for `Vary: *`)

fix: include `Vary: Accept` header to fix browser caching of adjacent pages and endpoints
