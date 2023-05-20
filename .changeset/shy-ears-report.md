---
'@sveltejs/kit': minor
---

feat: Support caching of responses with `Vary` header (except for `Vary: *`)

fix: Include `Vary: Accept` header to fix browser caching of adjacent pages and endpoints
