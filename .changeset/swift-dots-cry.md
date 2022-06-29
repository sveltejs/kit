---
'@sveltejs/kit': patch
'test-basics': patch
---

Fixes the error handling issue where an error thrown from an endpoint is returned as HTML (\_\_error.svelte)
regardless of whether or not the request was a client side fetch.
