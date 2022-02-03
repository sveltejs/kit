---
title: How do I fix the error I'm getting trying to include a package?
---

Vite's SSR support has become fairly stable since Vite 2.7. Most issues related to including a library are due to incorrect packaging.

Libraries work best with Vite when they distribute an ESM version and you may wish to suggest this to library authors. Here are a few things to keep in mind when checking if a library is packaged correctly:

- `exports` takes precedence over the other entry point fields such as `main` and `module`. Adding an `exports` field may not be backwards-compatible as it prevents deep imports.
- ESM files should end with `.mjs` unless `"type": "module"` is set in which any case CommonJS files should end with `.cjs`.
- `main` should be defined if `exports` is not. It should be either a CommonJS or ESM file and adhere to the previous bullet. If a `module` field is defined, it should refer to an ESM file.
- Svelte components should be distributed entirely as ESM and have a `svelte` field defining the entry point.

It is encouraged to make sure the dependencies of external Svelte components provide an ESM version. However, in order to handle CommonJS dependencies [`vite-plugin-svelte` will look for any CJS dependencies of external Svelte components](https://github.com/sveltejs/vite-plugin-svelte/blob/main/docs/faq.md#what-is-going-on-with-vite-and-pre-bundling-dependencies) and ask Vite to pre-bundle them by automatically adding them to Vite's `optimizeDeps.include` which will use `esbuild` to convert them to ESM. A side effect of this approach is that it takes longer to load the initial page. If this becomes noticable, try setting [experimental.prebundleSvelteLibraries: true](https://github.com/sveltejs/vite-plugin-svelte/blob/main/docs/config.md#prebundlesveltelibraries) in `svelte.config.js`. Note that this option is experimental.

If you are still encountering issues we recommend checking [the list of known Vite issues most commonly affecting SvelteKit users](https://github.com/sveltejs/kit/issues/2086) and searching both [the Vite issue tracker](https://github.com/vitejs/vite/issues) and the issue tracker of the library in question. Sometimes issues can be worked around by fiddling with the [`optimizeDeps`](https://vitejs.dev/config/#dep-optimization-options) or [`ssr`](https://vitejs.dev/config/#ssr-options) config values.
