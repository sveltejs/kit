---
'@sveltejs/kit': patch
---

fix: build the client render tree in place so async hydration does not observe a half-initialised tree
