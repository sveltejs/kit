---
'@sveltejs/adapter-bun': patch
'@sveltejs/adapter-node': patch
---

fix: only use `PORT_HEADER` when the forwarded host has no port
