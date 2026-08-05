---
'@sveltejs/adapter-node': patch
'@sveltejs/adapter-static': patch
'@sveltejs/adapter-cloudflare': patch
'@sveltejs/adapter-netlify': patch
'@sveltejs/adapter-vercel': patch
---

chore: use `node:fs` instead of deprecated `builder.rimraf` and `builder.mkdirp`
