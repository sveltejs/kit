---
'@sveltejs/kit': patch
---

fix: reconnect live queries after a 502, 503 or 504 from a proxy instead of failing them
