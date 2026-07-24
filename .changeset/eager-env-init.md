---
'@sveltejs/kit': patch
'@sveltejs/adapter-node': patch
'@sveltejs/adapter-cloudflare': patch
'@sveltejs/adapter-vercel': patch
'@sveltejs/adapter-netlify': patch
---

fix: populate env vars before `instrumentation.server.js` is evaluated

Previously, `$app/env/private` and `$app/env/public` dynamic variable values were only
populated when `Server.init()` called `set_env()`. If any module reading these values
was evaluated before `Server.init()` ran (e.g. via bundler chunk colocation with
`instrumentation.server.js`), the values would be silently `undefined`.

`builder.instrument()` now accepts an `env` option. When provided, the generated
facade creates a separate init module that imports `set_env` and calls it with the
platform's env before instrumentation is imported. This ensures dynamic env vars are
populated (and validated) before any instrumentation or application code is evaluated.

Adapters that have env available at module-load time pass the appropriate expression:
- adapter-node, adapter-vercel (serverless): `process.env`
- adapter-cloudflare: `env` from `cloudflare:workers`
- adapter-vercel (edge), adapter-netlify (serverless): env init via `generateText`

If required env vars are missing, `set_env` will throw — this is intentional, as the
app cannot function without them.
