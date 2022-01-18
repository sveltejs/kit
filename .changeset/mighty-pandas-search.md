---
'@sveltejs/adapter-cloudflare': patch
'@sveltejs/adapter-cloudflare-workers': patch
'@sveltejs/adapter-netlify': patch
'@sveltejs/adapter-node': patch
'@sveltejs/adapter-vercel': patch
'@sveltejs/kit': patch
---

Breaking: change app.render signature to (request: Request) => Promise<Response>
