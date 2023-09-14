---
title: Configuration
---

Votre configuration de projet se trouve dans un fichier `svelte.config.js` à la racine du projet. Comme SvelteKit, cet objet de configuration est utilisé par d'autres outillages qui s'intègrent avec Svelte tels que les extensions d'éditeurs de texte.

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

> TYPES: @sveltejs/kit#Config

La propriété `kit` configure SvelteKit, et peut avoir les propriétés suivantes :

> EXPANDED_TYPES: @sveltejs/kit#KitConfig
