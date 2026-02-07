---
'@sveltejs/kit': patch
---

fix: mark async SSR render promises as handled to avoid unhandled redirect rejections.
