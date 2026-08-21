---
'@sveltejs/adapter-bun': patch
---

chore: require Bun 1.4, which routes `HEAD` to `GET` handlers and settles `stop()` after a force close
