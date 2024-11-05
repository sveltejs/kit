---
'@sveltejs/kit': patch
---

fix: when using `@vitejs/plugin-basic-ssl`, set a no-op proxy config to downgrade from HTTP/2 to TLS since `undici` does not yet enable HTTP/2 by default
