---
'@sveltejs/kit': patch
---

fix: preserve the HTTP status and error body when a remote function request fails in transport (e.g. a 401/403 from a `handle` hook), instead of reporting a generic 500
