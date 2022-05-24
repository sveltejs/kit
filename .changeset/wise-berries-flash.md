---
'@sveltejs/adapter-cloudflare': patch
'@sveltejs/adapter-cloudflare-workers': patch
'@sveltejs/adapter-netlify': patch
'@sveltejs/adapter-node': patch
'@sveltejs/adapter-vercel': patch
'@sveltejs/kit': patch
---

only serve \_app/build with immutable cache header, not \_app/version.json
