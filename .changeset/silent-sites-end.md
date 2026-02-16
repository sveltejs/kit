---
'@sveltejs/kit': patch
---

fix: `config.kit.csp.directives['trusted-types']` requires `'svelte-trusted-html'` (and `'sveltekit-trusted-url'` when a service worker is automatically registered) if it is configured
