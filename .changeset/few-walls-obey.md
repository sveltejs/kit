---
'@sveltejs/adapter-cloudflare-workers': patch
---

[Breaking] refactor implementation from "Service Worker" pattern to "Module Worker" used in adapter-cloudflare

#### add the following to your wrangler.toml
```toml
		[build.upload]
		format = "modules"
		main = "./worker.mjs"
```
