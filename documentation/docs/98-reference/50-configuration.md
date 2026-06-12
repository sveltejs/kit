---
title: Configuration
---

Your project's configuration lives in the `vite.config.js` file at the root of your project. You can pass your configuration to the `sveltekit` plugin, along with the Svelte compiler options:

```js
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

> [!LEGACY]
> Before, you had to pass your configuration to the `svelte.config.js` file.
> After version 2.62.0, if the config is defined via the plugin, the `svelte.config.js` file is ignored.

## Config

> TYPES: Configuration#Config

## KitConfig

> EXPANDED_TYPES: Configuration#KitConfig
