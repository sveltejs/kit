---
"@sveltejs/kit": patch
---

fix: Do not automatically add a nonce to the `style-src` directive in the Content Security Policy when the `style-src` directive already contains `unsafe-inline`.