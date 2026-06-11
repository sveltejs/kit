---
'@sveltejs/kit': patch
---

fix: send `cache-control: private, no-store` on remote function responses so personalized query results can never be cached by shared caches
