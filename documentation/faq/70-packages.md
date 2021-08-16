---
question: How do I fix the error I'm getting trying to include a package?
---

The most commonly-encountered issue is having a Svelte component that imports a CommonJS library. In this case, you should try to work with the library authors to distribute an ESM version of the dependency. However, in the meantime, you can workaround this issue by adding the dependency to `vite.optimizeDeps.include` in `svelte.config.js`.

Also, some older Svelte libraries don't work nicely with Vite's pre-bundling process, check out `@sveltejs/vite-plugin-svelte`'s docs for current [limitations and workarounds](https://github.com/sveltejs/vite-plugin-svelte/tree/main/packages/vite-plugin-svelte#importing-third-party-svelte-libraries).

If you are still encountering issues we recommend checking [the list of known Vite issues most commonly affecting SvelteKit users](https://github.com/sveltejs/kit/issues/2086) and searching both [the Vite issue tracker](https://github.com/vitejs/vite/issues) and the issue tracker of the library in question. Sometimes issues can be worked around by fiddling with the [`optimizeDeps`](https://vitejs.dev/config/#dep-optimization-options) or [`ssr`](https://vitejs.dev/config/#ssr-options) config values.
