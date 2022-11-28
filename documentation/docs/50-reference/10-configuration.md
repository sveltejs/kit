---
title: Configuration
---

Your project's configuration lives in a `svelte.config.js` file at the root of your project. As well as SvelteKit, this config object is used by other tooling that integrates with Svelte such as editor extensions.

```js
/// file: svelte.config.js
import adapter from '@sveltejs/adapter-auto';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: {
		adapter: adapter()
	}
};

export default config;
```

> TYPES: @sveltejs/kit#Config

The `kit` property configures SvelteKit, and can have the following properties:

> EXPANDED_TYPES: @sveltejs/kit#KitConfig