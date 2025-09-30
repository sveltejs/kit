---
'@sveltejs/kit': patch
---

fix: avoid including `HEAD` twice when an unhandled HTTP method is used in a request to a `+server` handler that has both a `GET` handler and a `HEAD` handler
