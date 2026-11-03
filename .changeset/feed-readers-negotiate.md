---
'@sveltejs/kit': patch
---

fix: only treat a request as a page request when its `accept` header prioritises `text/html`
