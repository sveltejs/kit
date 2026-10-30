---
'@sveltejs/adapter-node': patch
---

fix: only remove a stale `SOCKET_PATH` file when nothing is listening on it, so cluster workers no longer delete the live socket
