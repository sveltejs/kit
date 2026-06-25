This module provides access to environment variables set _dynamically_ at runtime and that are _publicly_ accessible.

|         | Runtime                                                                    | Build time                                                               |
| ------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| Private | [`$env/dynamic/private`](https://svelte.dev/docs/kit/$env-dynamic-private) | [`$env/static/private`](https://svelte.dev/docs/kit/$env-static-private) |
| Public  | [`$env/dynamic/public`](https://svelte.dev/docs/kit/$env-dynamic-public)   | [`$env/static/public`](https://svelte.dev/docs/kit/$env-static-public)   |

Dynamic environment variables are defined by the platform you're running on. For example if you're using [`adapter-node`](https://github.com/sveltejs/kit/tree/main/packages/adapter-node) (or running [`vite preview`](https://svelte.dev/docs/kit/cli)), this is equivalent to `process.env`.

**_Public_ access:**

- This module _can_ be imported into client-side code
- **Only** variables that begin with [`config.kit.env.publicPrefix`](https://svelte.dev/docs/kit/configuration#env) (which defaults to `PUBLIC_`) are included

> [!NOTE] In `dev`, `$env/dynamic` includes environment variables from `.env`. In `prod`, this behavior will depend on your adapter.

> [!NOTE] To get correct types, environment variables referenced in your code should be declared (for example in an `.env` file), even if they don't have a value until the app is deployed:
>
> ```env
> MY_FEATURE_FLAG=
> ```
>
> You can override `.env` values from the command line like so:
>
> ```sh
> MY_FEATURE_FLAG="enabled" npm run dev
> ```

For example, given the following runtime environment:

```env
ENVIRONMENT=production
PUBLIC_BASE_URL=http://example.com
```

With the default `publicPrefix` and `privatePrefix`:

```ts
import { env } from '$env/dynamic/public';
console.log(env.ENVIRONMENT); // => undefined, not public
console.log(env.PUBLIC_BASE_URL); // => "http://example.com"
```

```

```
