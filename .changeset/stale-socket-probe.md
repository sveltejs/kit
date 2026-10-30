---
'@sveltejs/adapter-node': patch
---

fix: probe `SOCKET_PATH` for liveness before removing it on startup, so cluster workers no longer delete the live socket
