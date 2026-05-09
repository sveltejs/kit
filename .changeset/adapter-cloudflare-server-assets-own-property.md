---
'@sveltejs/adapter-cloudflare': patch
'@sveltejs/kit': patch
---

fix: use `Object.hasOwn` for `manifest._.server_assets` lookups so request paths matching `Object.prototype` keys (e.g. `/constructor`, `/__proto__`, `/toString`) are not treated as static assets. Applies to the Cloudflare adapter worker, the server-side `fetch` shim, the `$app/server` `read()` helper, and the Vite dev/preview `read` callbacks.
