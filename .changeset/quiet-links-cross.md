---
'@sveltejs/kit': patch
---

fix: add `crossorigin` to SSR stylesheet links and `Link` preload headers so browsers don't block CSS from a cross-origin `paths.assets` after client-side navigation. The asset server must now send `Access-Control-Allow-Origin` for CSS as well as JavaScript. Pages with `csr = false` could load CSS without it before.
