This module provides access to environment variables set _dynamically_ at runtime and that are limited to _private_ access.

| | Runtime | Buildtime |
|-|-|-|
| Private | `$env/dynamic/private` | [`$env/static/private`](https://svelte.dev/docs/kit/$env-static-private) |
| Public | [`$env/dynamic/public`](https://svelte.dev/docs/kit/$env-dynamic-public) | [`$env/static/public`](https://svelte.dev/docs/kit/$env-static-public) |

Runtime environment variables are defined by the platform you're running on. For example if you're using [`adapter-node`](https://github.com/sveltejs/kit/tree/main/packages/adapter-node) (or running [`vite preview`](https://svelte.dev/docs/kit/cli)), this is equivalent to `process.env`.

**_Private_ access:**
- This module (and [`$env/static/private`](https://svelte.dev/docs/kit/$env-static-private)) cannot be imported into client-side code.
- Variables that begin with [`config.kit.env.publicPrefix`](https://svelte.dev/docs/kit/configuration#env) (which defaults to `PUBLIC_`) are **excluded**.
- Variables that begin with [`config.kit.env.privatePrefix`](https://svelte.dev/docs/kit/configuration#env) (which defaults to allow-all) are **included**.

> [!NOTE] In `dev`, `$env/dynamic` includes environment variables from `.env`. In `prod`, this behavior will depend on your adapter.

> [!NOTE] To get correct types, environment variables referenced in your code should be declared (for example in an `.env` file), even if they don't have a value until the app is deployed:
> ```env
> MY_FEATURE_FLAG=
> ```
> You can override `.env` values from the command line like so:
> ```sh
> MY_FEATURE_FLAG="enabled" npm run dev
> ```

For example, suppose the runtime environment variables were set like this:

```env
ENVIRONMENT=production
PUBLIC_BASE_URL=http://site.com
```

If the `publicPrefix` is set to `PUBLIC_` and the `privatePrefix` is not set (the default behaviour):

```ts
import { env } from '$env/dynamic/private';

console.log(env.ENVIRONMENT); // => "production"
console.log(env.PUBLIC_BASE_URL); // => undefined
```
