---
'@sveltejs/adapter-cloudflare-workers': patch
'@sveltejs/adapter-netlify': patch
'@sveltejs/kit': patch
---

Ensure the raw body is an Uint8Array before passing it to request handlers
