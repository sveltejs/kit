---
'@sveltejs/kit': patch
---

fix: replace the generated `$app/tsconfig.json` atomically so concurrent syncs can't tear it
