---
'@sveltejs/kit': minor
'@sveltejs/adapter-node': patch
---

feat: abort `request.signal` when the response closes prematurely, via a new `response` option for `getRequest`
