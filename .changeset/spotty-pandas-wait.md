---
'@sveltejs/adapter-netlify': patch
'@sveltejs/adapter-vercel': patch
---

fix: await `init` on every request to prevent race condition
