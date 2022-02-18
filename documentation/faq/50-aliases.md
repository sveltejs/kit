---
title: How do I setup a path alias?
---

First, you need to add it to the Vite configuration. In `svelte.config.js` add [`vite.resolve.alias`](https://vitejs.dev/config/#resolve-alias):

```js
/// file: svelte.config.js
// @filename: ambient.d.ts
declare module 'path';

// @filename: index.js
import path from 'path';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: {
		vite: {
			resolve: {
				alias: {
					$utils: path.resolve('./src/utils')
				}
			}
		}
	}
};

export default config;
```

Then, to make TypeScript aware of the alias, add it to `tsconfig.json` (for TypeScript users) or `jsconfig.json`:

```json
{
	"compilerOptions": {
		"paths": {
			"$utils/*": ["src/utils/*"]
		}
	}
}
```
