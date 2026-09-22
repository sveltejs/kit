---
'@sveltejs/adapter-vercel': patch
---

fix: ignore `EEXIST` errors when symlinking traced files that resolve to the same destination
