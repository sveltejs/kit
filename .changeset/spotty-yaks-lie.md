---
'@sveltejs/adapter-node': patch
---

fix: fallback to `host` header if header specified by `HOST_HEADER` is not in request headers
