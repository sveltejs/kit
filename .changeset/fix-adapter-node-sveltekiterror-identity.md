---
'@sveltejs/adapter-node': patch
---

fix: mark `@sveltejs/kit/node` as external in the rollup build so the `SvelteKitError` class used by the body-size-limit stream is the same instance as the one checked by the kit runtime — preventing oversized-body 413 errors from being returned as 500s
