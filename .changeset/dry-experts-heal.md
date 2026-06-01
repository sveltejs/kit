---
'@sveltejs/kit': patch
---

fix: avoid preloading with the Link header by default. Use `config.kit.output.linkHeaderPreload` to re-enable this behaviour
