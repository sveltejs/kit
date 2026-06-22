---
'@sveltejs/adapter-node': patch
---

fix: avoid circular dependency between server initialisation and hook retrieval that causes the app to crash on start
