---
question: How do I fix the error I'm getting trying to include a package?
---

Old beta versions of the SvelteKit template included the configuration value `noExternal: Object.keys(pkg.dependencies || {})` in `svelte.config.cjs`. First, please check if this line is present in your project and remove it if so. Removing this line fixes most issues and has since been removed from the template.

The second most commonly-encountered issue is having a Svelte component that imports a CommonJS library. In this case, you should try to work with the library authors to distribute an ESM version of the dependency. However, in the meantime, you can workaround this issue by adding the dependency to `vite.optimizeDeps.include` in `svelte.config.cjs`.

Finally, Vite has had some issues that have been fixed, so we recommend upgrading to the latest version of Vite. If you are still encountering issues we recommend searching both [the Vite issue tracker](https://github.com/vitejs/vite/issues) and the issue tracker of the library in question. Sometimes issues can be worked around by fiddling with the [`optimizeDeps`](https://vitejs.dev/config/#dep-optimization-options) or [`ssr`](https://vitejs.dev/config/#ssr-options) config values.
