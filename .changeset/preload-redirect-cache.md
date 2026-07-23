---
'@sveltejs/kit': patch
---

fix: don't cache preloaded redirect results, so navigation re-runs `load` instead of replaying a stale redirect
