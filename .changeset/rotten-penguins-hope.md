---
'@sveltejs/adapter-node': major
---

breaking: remove polyfill option. fetch APIs will now always come from the platform being used. File and crypto APIs will be polyfilled if not available
