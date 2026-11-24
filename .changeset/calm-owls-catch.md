---
'@sveltejs/adapter-node': patch
---

fix: respond with a 500 instead of crashing the server when serving a static or prerendered file fails unexpectedly
