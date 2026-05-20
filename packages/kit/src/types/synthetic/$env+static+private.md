This module provides access to environment variables that are injected _statically_ into your bundle at build time and are limited to _private_ access.

|         | Runtime                                                                    | Build time                                                               |
| ------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| Private | [`$env/dynamic/private`](https://svelte.dev/docs/kit/$env-dynamic-private) | [`$env/static/private`](https://svelte.dev/docs/kit/$env-static-private) |
| Public  | [`$env/dynamic/public`](https://svelte.dev/docs/kit/$env-dynamic-public)   | [`$env/static/public`](https://svelte.dev/docs/kit/$env-static-public)   |

Static environment variables are [loaded by Vite](https://vitejs.dev/guide/env-and-mode.html#env-files) from `.env` files and `process.env` at build time and then statically injected into your bundle at build time, enabling optimisations like dead code elimination.

**_Private_ access:**

- This module cannot be imported into client-side code
- This module only includes variables that _do not_ begin with [`config.kit.env.publicPrefix`](https://svelte.dev/docs/kit/configuration#env) _and do_ start with [`config.kit.env.privatePrefix`](https://svelte.dev/docs/kit/configuration#env) (if configured)

For example, given the following build time environment:

```env
ENVIRONMENT=production
PUBLIC_BASE_URL=http://site.com
```

With the default `publicPrefix` and `privatePrefix`:

```ts
import { ENVIRONMENT, PUBLIC_BASE_URL } from '$env/static/private';

console.log(ENVIRONMENT); // => "production"
console.log(PUBLIC_BASE_URL); // => throws error during build
```

The above values will be the same _even if_ different values for `ENVIRONMENT` or `PUBLIC_BASE_URL` are set at runtime, as they are statically replaced in your code with their build time values.
