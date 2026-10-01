---
'@sveltejs/adapter-node': patch
---

fix: don't send `Vary: Accept-Encoding` for assets that were never precompressed
