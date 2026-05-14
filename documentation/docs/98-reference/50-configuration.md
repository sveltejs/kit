---
title: Configuration
---

Your project's configuration lives in a `svelte.config.js` file at the root of your project. As well as SvelteKit, this config object is used by other tooling that integrates with Svelte such as editor extensions.

```js
/// file: svelte.config.js
/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: { }
};

export default config;
```

> [!LEGACY]
> The `adapter` option was moved to the SvelteKit Vite plugin in SvelteKit 3.0.0. In earlier versions, you had to add it to the `kit` property in the `svelte.config.js` file instead.

## Config

> TYPES: Configuration#Config

## KitConfig

The `kit` property configures SvelteKit, and can have the following properties:

> EXPANDED_TYPES: Configuration#KitConfig
