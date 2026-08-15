---
'@sveltejs/kit': patch
---

fix: normalise Node.js `Buffer` to `Uint8Array` in SSR hydration serialiser to prevent pool bytes from leaking into the page and causing `illegal character U+FFFD` SyntaxErrors
