---
title: Configuration
---

Your project's configuration lives in the `vite.config.js` file at the root of your project. You can pass your configuration to the `sveltekit` plugin, along with the Svelte compiler options:

```js
// TODO: remove this and install @sveltejs/adapter-auto in svelte.dev to get the types
// @filename: ambient.d.ts
declare module '@sveltejs/adapter-auto' {
	const plugin: () => import('@sveltejs/kit').Adapter;
	export default plugin;
}

// @filename: index.js
// ---cut---
/// file: vite.config.js
import adapter from '@sveltejs/adapter-auto';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [
		sveltekit({
			compilerOptions: {
				experimental: {
					async: true
				}
			},
			adapter: adapter(),
			experimental: {
				remoteFunctions: true
			}
		})
	]
});
```

As well as SvelteKit, the plugin options are used by other tooling that integrates with Svelte such as editor extensions.

Any options that don't belong to SvelteKit are passed through to [`vite-plugin-svelte`](https://github.com/sveltejs/vite-plugin-svelte/blob/main/docs/config.md), so you can set options like `inspector` here too. The `experimental` namespace is shared — SvelteKit reads its own flags and forwards the rest.

> [!LEGACY]
> Before, you could only pass your configuration to the `svelte.config.js` file.
> After version 2.62.0, if the config is defined via the plugin, the `svelte.config.js` file is ignored.

## KitConfig

An extension of [`vite-plugin-svelte`'s options](https://github.com/sveltejs/vite-plugin-svelte/blob/main/docs/config.md#config-file).

> EXPANDED_TYPES: Configuration#KitConfig
