This module provides access to environment variables set _dynamically_ at runtime, as defined by the platform you're running on. For example if you're using [`adapter-node`](https://github.com/sveltejs/kit/tree/main/packages/adapter-node) (or running [`vite preview`](https://svelte.dev/docs/kit/cli)), this is equivalent to `process.env`.

This module only includes variables that _do not_ begin with [`config.kit.env.publicPrefix`](https://svelte.dev/docs/kit/configuration#env) _and do_ start with [`config.kit.env.privatePrefix`](https://svelte.dev/docs/kit/configuration#env) (if configured).

This module (and `$env/static/private`) cannot be imported into client-side code.

> [!NOTE] In `dev`, `$env/dynamic` includes environment variables from `.env`. In `prod`, this behavior will depend on your adapter.

For example, suppose the runtime environment variables were set like this:

```env
PUBLIC_EXAMPLE_VARIABLE=foo
OTHER_VARIABLE=bar
```

If the `publicPrefix` is set to `PUBLIC_` and the `privatePrefix` is not set (the default behaviour):

```ts
import { env } from '$env/dynamic/private';
console.log(env.PUBLIC_EXAMPLE_VARIABLE); // => undefined
console.log(env.OTHER_VARIABLE); // => "bar"
```
