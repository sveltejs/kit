---
'@sveltejs/adapter-cloudflare': patch
---

fix: use `Object.hasOwn` for `server_assets` lookup so request paths matching `Object.prototype` keys (e.g. `/constructor`, `/__proto__`, `/toString`) are not misrouted to `env.ASSETS.fetch`
