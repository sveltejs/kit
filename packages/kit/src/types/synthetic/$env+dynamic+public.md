Similar to [`$env/dynamic/private`](https://svelte.dev/docs/kit/$env-dynamic-private), this module provides access to environment variables set _dynamically_ at runtime, but that are _publicly_ accessible.

Runtime environment variables are defined by the platform you're running on. For example if you're using [`adapter-node`](https://github.com/sveltejs/kit/tree/main/packages/adapter-node) (or running [`vite preview`](https://svelte.dev/docs/kit/cli)), this is equivalent to `process.env`.

**_Public_ access:**
- This module (and [`$env/static/public`](https://svelte.dev/docs/kit/$env-static-public)) _can_ be imported into client-side code.
- **Only** variables that begin with [`config.kit.env.publicPrefix`](https://svelte.dev/docs/kit/configuration#env) (which defaults to `PUBLIC_`) are included.

> [!NOTE] In `dev`, `$env/dynamic` includes environment variables from `.env`. In `prod`, this behavior will depend on your adapter.

For example, suppose the runtime environment variables were set like this:

```env
PUBLIC_EXAMPLE_VARIABLE=foo
OTHER_VARIABLE=bar
```

If the `publicPrefix` is set to `PUBLIC_` and the `privatePrefix` is not set (the default behaviour):

```ts
import { env } from '$env/dynamic/public';
console.log(env.PUBLIC_EXAMPLE_VARIABLE); // => "foo"
console.log(env.OTHER_VARIABLE); // => undefined
```
