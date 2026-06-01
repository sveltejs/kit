---
title: Configuration
---

Your project's configuration lives in a `svelte.config.js` file at the root of your project. As well as SvelteKit, this config object is used by other tooling that integrates with Svelte such as editor extensions.

```js
/// file: svelte.config.js
// @filename: ambient.d.ts
declare module '@sveltejs/adapter-auto' {
	const plugin: () => import('@sveltejs/kit').Adapter;
	export default plugin;
}

// @filename: index.js
// ---cut---
import adapter from '@sveltejs/adapter-auto';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: {
		adapter: adapter()
	}
};

export default config;
```

Since version 2.62.0 you can also pass your configuration to the `sveltekit` plugin inside `vite.config.js/ts`, along with the Svelte compiler options:

```js
/// file: vite.config.js
// @filename: ambient.d.ts
declare module '@sveltejs/adapter-auto' {
	const plugin: () => import('@sveltejs/kit').Adapter;
	export default plugin;
}

// @filename: index.js
// ---cut---
import adapter from '@sveltejs/adapter-auto';
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

Note how the `kit` namespace is at the same level as the other top level entries; this is the only difference to the `svelte.config.js` layout.

If the config is defined via the plugin, the `svelte.config.js` file is ignored.

## Config

> TYPES: Configuration#Config

## KitConfig

The `kit` property configures SvelteKit, and can have the following properties:

> EXPANDED_TYPES: Configuration#KitConfig
