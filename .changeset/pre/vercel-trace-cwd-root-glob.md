---
'@sveltejs/adapter-vercel': patch
---

fix: trace `process.cwd()`-relative files from the project directory and never glob from the filesystem root
