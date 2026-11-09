---
'@sveltejs/adapter-cloudflare': major
---

breaking: replace the `platformProxy` option with `persistState` and `remoteBindings`, which are passed to both the platform proxy and the Cloudflare Vite plugin so that `vite dev` and `vite preview` emulate bindings the same way
