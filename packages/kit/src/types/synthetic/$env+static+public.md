This module provides access to environment variables that are injected _statically_ into your bundle at build time and are _publicly_ accessible.

|         | Runtime                                                                    | Build time                                                               |
| ------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| Private | [`$env/dynamic/private`](https://svelte.dev/docs/kit/$env-dynamic-private) | [`$env/static/private`](https://svelte.dev/docs/kit/$env-static-private) |
| Public  | [`$env/dynamic/public`](https://svelte.dev/docs/kit/$env-dynamic-public)   | [`$env/static/public`](https://svelte.dev/docs/kit/$env-static-public)   |

Static environment variables are [loaded by Vite](https://vitejs.dev/guide/env-and-mode.html#env-files) from `.env` files and `process.env` at build time and then statically injected into your bundle at build time, enabling optimisations like dead code elimination.

**_Public_ access:**

- This module _can_ be imported into client-side code
- **Only** variables that begin with [`config.kit.env.publicPrefix`](https://svelte.dev/docs/kit/configuration#env) (which defaults to `PUBLIC_`) are included

For example, given the following build time environment:

```env
ENVIRONMENT=production
PUBLIC_BASE_URL=http://site.com
```

With the default `publicPrefix` and `privatePrefix`:

```ts
import { ENVIRONMENT, PUBLIC_BASE_URL } from '$env/static/public';

console.log(ENVIRONMENT); // => throws error during build
console.log(PUBLIC_BASE_URL); // => "http://site.com"
```

The above values will be the same _even if_ different values for `ENVIRONMENT` or `PUBLIC_BASE_URL` are set at runtime, as they are statically replaced in your code with their build time values.
