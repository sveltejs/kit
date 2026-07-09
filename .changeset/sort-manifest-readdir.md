---
'@sveltejs/kit': patch
---

fix: sort directory entries when building the route manifest so node indices are deterministic across runtimes (e.g. Bun and Node)
