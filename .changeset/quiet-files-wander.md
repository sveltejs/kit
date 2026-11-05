---
'@sveltejs/kit': patch
---

fix: include assets imported through dynamic imports, remote functions and param matchers in `builder.findServerAssets` so that `read` can find them
