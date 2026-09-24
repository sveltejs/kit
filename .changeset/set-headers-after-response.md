---
'@sveltejs/kit': patch
---

fix: throw when `setHeaders` is called after the response has been generated, whichever copy of the event it is called on
