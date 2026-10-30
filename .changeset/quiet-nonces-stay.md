---
'@sveltejs/kit': patch
---

fix: add the CSP nonce for scripts in `app.html` to `script-src` when a page has `csr = false`
