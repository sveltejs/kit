---
"@sveltejs/kit": patch
---

fix: only add nonce to `script-src-elem`, `style-src-attr` and `style-src-elem` CSP directives when `unsafe-inline` is not present
