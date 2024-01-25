---
'@sveltejs/kit': patch
---

fix: strip `/@fs` prefix correctly on Windows when invoking `read()` in dev mode
