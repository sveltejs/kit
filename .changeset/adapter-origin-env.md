---
'@sveltejs/adapter-node': patch
'@sveltejs/adapter-bun': patch
---

fix: use the environment variable named by `paths.origin`, such as `{ env: 'ORIGIN' }`, as the request origin
