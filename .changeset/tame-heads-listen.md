---
'@sveltejs/adapter-cloudflare': patch
---

fix: skip cache lookup for non-GET requests to avoid 500 on HEAD requests

worktop's `Cache.lookup` rebuilds HEAD requests as GET via `new Request(req, { method: 'GET' })`, which preserves the `Content-Length: 0` header with a null body. Cloudflare's cache API throws on such requests, turning every HEAD request into a 500. Since `Cache.save` only writes GET responses to the cache, HEAD requests can never hit the cache anyway — skip the lookup entirely for non-GET requests.
