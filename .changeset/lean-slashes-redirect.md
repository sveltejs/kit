---
'@sveltejs/adapter-vercel': patch
'@sveltejs/adapter-static': patch
---

fix: normalize trailing slashes with a single route when every route uses the same `trailingSlash` option, rather than adding routes for each prerendered page
