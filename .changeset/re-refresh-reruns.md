---
'@sveltejs/kit': patch
---

fix: prevent infinite loops when server-side queries refresh each other in a cycle during the single-flight drain
