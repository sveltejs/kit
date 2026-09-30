---
'@sveltejs/kit': patch
---

fix: keep `history.scrollRestoration` set to `manual` when leaving the page, so a document restored from the back/forward cache does not fall back to browser scroll restoration
