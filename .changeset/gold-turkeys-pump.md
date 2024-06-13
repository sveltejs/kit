---
"@sveltejs/adapter-node": patch
---

fix: close keep-alive connections as soon as possible during graceful shutdown rather than accepting new requests
