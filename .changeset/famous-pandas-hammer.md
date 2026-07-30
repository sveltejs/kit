---
'@sveltejs/kit': patch
---

fix: exclude routes without a page or endpoint from `routes` in `$app/manifest`, and remove directories with no route files from `LayoutParams`
