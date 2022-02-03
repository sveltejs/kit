---
title: How do I setup a path alias?
---

First, you need to add it to the Vite configuration. In `svelte.config.js` add [`vite.resolve.alias`](https://vitejs.dev/config/#resolve-alias):

```js
// svelte.config.js
import path from 'path';

export default {
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
```

Then, to make TypeScript aware of the alias, add it to `tsconfig.json` (for TypeScript users) or `jsconfig.json`:

```js
{
  "compilerOptions": {
    "paths": {
      "$utils/*": ["src/utils/*"]
    }
  }
}
```
