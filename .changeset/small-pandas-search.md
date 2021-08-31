---
'@sveltejs/kit': patch
---

To avoid 404, replace `kit.paths.base` to '' if it runs on dev server (localhost).
