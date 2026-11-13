---
'@sveltejs/adapter-bun': patch
---

fix: work around intermittent `Could not resolve` failures in `buildOptions.compile` builds, caused by Bun reusing a stale directory listing in the first `Bun.build` of a process
