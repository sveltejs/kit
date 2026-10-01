---
'@sveltejs/adapter-netlify': patch
---

fix: strip trailing slashes from prerendered paths in the edge function exclude list, so the root page is served statically when using a base path
