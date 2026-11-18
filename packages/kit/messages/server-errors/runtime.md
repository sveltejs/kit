## server_api_unavailable

> Cannot call `%name%` on the server

This function only works in the browser, because it depends on the client-side router or on browser state. Don't call it while rendering on the server — for example at the top level of a component's `<script>` block, or in a universal `load` function that also runs on the server. Call it from an event handler or an [`$effect`](https://svelte.dev/docs/svelte/$effect) instead, or check [`browser`](https://svelte.dev/docs/kit/$app-env#browser) from `$app/env` first.

## state_read_outside_render

> Can only read `%name%` on the server during rendering (not in e.g. `load` functions), as it is bound to the current request via component context. This prevents state from leaking between users.

On the server, [`$app/state`](https://svelte.dev/docs/kit/$app-state) reads the state of the request that is currently being rendered from component context, so that one user's data can never [leak to another](https://svelte.dev/docs/kit/state-management#Avoid-shared-state-on-the-server). That context only exists while components render. In `load` functions, hooks and endpoints, use the values passed to the function instead — such as `url`, `params` and the result of `parent()` — or [`getRequestEvent`](https://svelte.dev/docs/kit/$app-server#getRequestEvent).

## read_implementation_missing

> No `read` implementation was provided. Please ensure that your adapter is up to date and supports this feature

[`read`](https://svelte.dev/docs/kit/$app-server#read) relies on the adapter to read files at runtime, and the adapter you're using didn't provide a way to do that. Update the adapter to its latest version. If it still doesn't support `read`, [prerender](https://svelte.dev/docs/kit/page-options#prerender) the routes that use it, or import the file's contents directly (for example with Vite's `?raw` suffix).

## read_asset_missing

> Asset does not exist: `%file%`

[`read`](https://svelte.dev/docs/kit/$app-server#read) can only read files that your server code imports, because those are the files SvelteKit copies into the server output. Pass it the URL you get from importing the file, rather than a path you've built yourself:

```js
import { read } from '$app/server';
import file from './data.txt';

const text = await read(file).text();
```

## url_search_unavailable_prerender

> Cannot access `url.%property%` on a page with prerendering enabled

A [prerendered](https://svelte.dev/docs/kit/page-options#prerender) page is generated once at build time and then served as a static file for every request, whatever its query string, so its `load` functions can't depend on `url.search` or `url.searchParams`. Read the query string in the browser instead — for example with [`page.url.searchParams`](https://svelte.dev/docs/kit/$app-state#page) in a component — or disable prerendering for the page.

## define_env_vars_moved

> `defineEnvVars` has moved — import it from `@sveltejs/kit/env` instead

In SvelteKit 3, [`defineEnvVars`](https://svelte.dev/docs/kit/@sveltejs-kit-env#defineEnvVars) lives in `@sveltejs/kit/env` rather than `@sveltejs/kit/hooks`. Update the import in `src/env`:

```js
/// file: src/env.js
import { defineEnvVars } from '@sveltejs/kit/env';

export const variables = defineEnvVars({
	API_KEY: {}
});
```

## env_invalid

> Invalid environment variables:
> %issues%

The [environment variables](https://svelte.dev/docs/kit/environment-variables) declared in `src/env` are [validated](https://svelte.dev/docs/kit/environment-variables#Validation) when your app builds and when it starts, and some values didn't pass. Each variable is listed with its issues. Issues reported by your own validators are shown as they are. SvelteKit reports these itself:

- **Value is missing** — a variable without a `schema` is required. Set it in the environment (or a `.env` file), or add a validator that accepts `undefined`, such as Valibot's `v.optional(v.string())` or a function that returns a default.
- **The validator does not implement Standard Schema** — `schema` must be a function or a [Standard Schema](https://standardschema.dev), such as one created with Valibot, Zod or ArkType.
- **The validator is async** — environment variables are validated synchronously, so a function validator can't return a promise, and a schema can't use asynchronous validation.

To require a variable when the app starts but not while building it, use [`building`](https://svelte.dev/docs/kit/$app-env#building) from `$app/env` to choose the validator.
