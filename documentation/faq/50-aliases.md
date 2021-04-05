---
question: How do I setup a path alias?
---

Please be aware that you will probably want the alias specified in two places.

In `svelte.config.cjs` add [`vite.resolve.alias`](https://vitejs.dev/config/#resolve-alias):

```
// svelte.config.cjs
const path = require('path');
module.exports = {
  kit: {
    vite: {
      resolve: {
        alias: {
          '$utils': path.resolve('./src/utils')
        }
      }
    }
  }
};
``

In `tsconfig.json` (for TypeScript users) or `jsconfig.json` (for JavaScript users) to make VS Code aware of the alias:
```
{
  "compilerOptions": {
    "paths": {
      "$utils/*": ["src/utils/*"]
    }
  }
}
```
