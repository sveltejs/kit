This module provides access to environment variables that are injected _statically_ into your bundle at buildtime and are limited to _private_ access.

| | Runtime | Buildtime |
|-|-|-|
| Private | [`$env/dynamic/private`](https://svelte.dev/docs/kit/$env-dynamic-private) | `$env/static/private` |
| Public | [`$env/dynamic/public`](https://svelte.dev/docs/kit/$env-dynamic-public) | [`$env/static/public`](https://svelte.dev/docs/kit/$env-static-public) |

Environment variables are [loaded by Vite](https://vitejs.dev/guide/env-and-mode.html#env-files) from `.env` files and `process.env` at build time and then statically injected into your bundle at build time, enabling optimisations like dead code elimination.

**_Private_ access:**
- This module (and [`$env/dynamic/private`](https://svelte.dev/docs/kit/$env-dynamic-private)) cannot be imported into client-side code.
- Variables that begin with [`config.kit.env.publicPrefix`](https://svelte.dev/docs/kit/configuration#env) (which defaults to `PUBLIC_`) are **excluded**.
- Variables that begin with [`config.kit.env.privatePrefix`](https://svelte.dev/docs/kit/configuration#env) (which defaults to allow-all) are **included**.

For example, suppose the environment variables were set like this during build:

```env
ENVIRONMENT=production
PUBLIC_BASE_URL=http://site.com
```

If the `publicPrefix` is set to `PUBLIC_` and the `privatePrefix` is not set (the default behaviour):

```ts
import { ENVIRONMENT, PUBLIC_BASE_URL } from '$env/static/private';

console.log(ENVIRONMENT); // => "production"
console.log(PUBLIC_BASE_URL); // => undefined, throws error during build
```
