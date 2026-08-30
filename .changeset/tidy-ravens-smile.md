---
'@sveltejs/kit': patch
---

fix: render the error page with the post-`handle` headers instead of failing on headers the crashed render already set
