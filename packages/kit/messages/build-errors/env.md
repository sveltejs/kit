## env_invalid_variable_name

> Invalid environment variable name `%name%`

The keys of the `variables` object exported from `src/env` become exports of `$app/env/private` and `$app/env/public`, so each name must be a valid JavaScript identifier that isn't a reserved word — for example `API_KEY` rather than `api-key` or `default`.

## env_variables_missing

> `%file%` must export a variables object

`src/env.js` (or `src/env.ts`) declares your app's [environment variables](https://svelte.dev/docs/kit/environment-variables). Export them as an object called `variables`:

```js
/// file: src/env.js
import { defineEnvVars } from '@sveltejs/kit/env';

export const variables = defineEnvVars({
	API_KEY: {}
});
```

## env_app_import

> Cannot import `$app/*` modules other than `$app/env` inside `src/env`

SvelteKit evaluates `src/env` and its dependencies before the rest of your app exists, in order to learn which [environment variables](https://svelte.dev/docs/kit/environment-variables) are declared. At that point only `$app/env` is available. Move code that needs other `$app/*` modules out of `src/env` and the modules it imports.

## env_circular_import

> Cannot import `$app/env/%type%` inside `src/env` or its dependencies because it creates a circular dependency

> Module `%importer%` imports `$app/env/%type%`, which creates a circular dependency with `src/env`

`$app/env/private` and `$app/env/public` are generated from the `variables` exported by `src/env`, so `src/env` — and any module it imports, directly or indirectly — cannot import them. Remove the import from the module in question, or stop importing that module from `src/env`.

If you need a variable's value while declaring your variables (for example, to compute a default), read it from `process.env` instead.
