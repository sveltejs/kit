---
'@sveltejs/adapter-node': patch
---

fix: replace the port in the forwarded host with `PORT_HEADER` instead of appending a second one
