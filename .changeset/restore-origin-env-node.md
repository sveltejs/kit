---
'@sveltejs/adapter-node': patch
---

fix: restore the `ORIGIN` environment variable, which overrides `paths.origin` at runtime
