---
'@sveltejs/kit': patch
---

avoid setting rawBody/body to an empty Uint8Array when a load's fetch function is called with no body during SSR
