---
'@sveltejs/adapter-bun': patch
---

fix: serve client and prerendered files whichever way the request path is percent-encoded, and allow `*` and a leading `:` in their filenames
