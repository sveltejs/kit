---
'@sveltejs/kit': patch
---

fix: add `crossorigin` to SSR stylesheet links and `Link` preload headers so browsers don't block CSS from a cross-origin `paths.assets` after client-side navigation
