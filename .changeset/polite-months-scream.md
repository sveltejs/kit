---
'@sveltejs/kit': patch
---

fix: prerendered routes will throw when exposing both a GET handler and a page, preventing impossible content negotiation
