---
question: How do I fix the error I'm getting trying to include a package?
---

SSR in Vite is not yet stable. Libraries work best with Vite when they distribute both CJS and ESM in their package and you may wish to work with library authors to make this happen.

If you are still encountering issues we recommend checking [the list of known Vite issues most commonly affecting SvelteKit users](https://github.com/sveltejs/kit/issues/2086) and searching both [the Vite issue tracker](https://github.com/vitejs/vite/issues) and the issue tracker of the library in question. Sometimes issues can be worked around by fiddling with the [`optimizeDeps`](https://vitejs.dev/config/#dep-optimization-options) or [`ssr`](https://vitejs.dev/config/#ssr-options) config values.
