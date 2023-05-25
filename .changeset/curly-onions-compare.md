---
'@sveltejs/kit': patch
---

fix: gracefully handle server endpoints that return `Response`s with immutable `Headers` when prerendering
