---
'@sveltejs/kit': patch
---

fix: prevent server-side route resolution from loading code from another origin for pathnames starting with `//`
