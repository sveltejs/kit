This module provides access to environment variables that are injected _statically_ into your bundle at buildtime and are _publicly_ accessible.

| | Runtime | Buildtime |
|-|-|-|
| Private | [`$env/dynamic/private`](https://svelte.dev/docs/kit/$env-dynamic-private) | [`$env/static/private`](https://svelte.dev/docs/kit/$env-static-private) |
| Public | [`$env/dynamic/public`](https://svelte.dev/docs/kit/$env-dynamic-public) | `$env/static/public` |

Environment variables are [loaded by Vite](https://vitejs.dev/guide/env-and-mode.html#env-files) from `.env` files and `process.env` at build time and then statically injected into your bundle at build time, enabling optimisations like dead code elimination.

**_Public_ access:**
- This module (and [`$env/dynamic/public`](https://svelte.dev/docs/kit/$env-dynamic-public)) _can_ be imported into client-side code.
- **Only** variables that begin with [`config.kit.env.publicPrefix`](https://svelte.dev/docs/kit/configuration#env) (which defaults to `PUBLIC_`) are included.

For example, suppose the environment variables were set like this during build:

```env
ENVIRONMENT=production
PUBLIC_BASE_URL=http://site.com
```

Assuming the `publicPrefix` is set to `PUBLIC_` and the `privatePrefix` is not set (the default behaviour), this is what would happen at runtime, even if the environment variables at runtime are different:

```ts
import { ENVIRONMENT, PUBLIC_BASE_URL } from '$env/static/public';

console.log(ENVIRONMENT); // => undefined, throws error during build
console.log(PUBLIC_BASE_URL); // => "http://site.com"
```
