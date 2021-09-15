---
question: How do I fix the error I'm getting trying to include a package?
---

SSR in Vite is not yet stable. Libraries work best with Vite when they distribute both CJS and ESM in their package and you may wish to work with library authors to make this happen.

Svelte components must be written entirely in ESM. It is encouraged to make sure the dependencies of Svelte components provide an ESM version. However,in order to handle CJS dependencies [`vite-plugin-svelte` will look for any CJS dependencies](https://github.com/sveltejs/vite-plugin-svelte/blob/main/docs/faq.md#what-is-going-on-with-vite-and-pre-bundling-dependencies) and ask Vite to pre-bundle them by automatically adding them to Vite's `optimizeDeps.include` which will use `esbuild` to convert them to ESM.

If you are still encountering issues we recommend checking [the list of known Vite issues most commonly affecting SvelteKit users](https://github.com/sveltejs/kit/issues/2086) and searching both [the Vite issue tracker](https://github.com/vitejs/vite/issues) and the issue tracker of the library in question. Sometimes issues can be worked around by fiddling with the [`optimizeDeps`](https://vitejs.dev/config/#dep-optimization-options) or [`ssr`](https://vitejs.dev/config/#ssr-options) config values.
