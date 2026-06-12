---
'@sveltejs/kit': patch
---

fix: forward worker errors from `forked()` so build failures surface the underlying exception instead of `Failed with code 1`
