---
'@sveltejs/kit': patch
---

fix: prerender pages that share the same route as a `+server.js` file even if it does not export a `GET` method
