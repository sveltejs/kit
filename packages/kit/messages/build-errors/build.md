## server_only_import

> Cannot import `%module%` into code that runs in the browser, as this could leak sensitive information.
>
> %chain%
>
> If you're only using the import as a type, change it to `import type`.

[Server-only modules](https://svelte.dev/docs/kit/server-only-modules) — `$app/server`, `$app/env/private`, files named `*.server.js` and anything inside a `server` directory — can only be imported by code that never runs in the browser, such as `+page.server.js`, `+layout.server.js`, `+server.js` and `hooks.server.js`. The import chain in the error shows how the server-only module ends up in client code, starting from a client entry point (such as a `+page.svelte`, a universal `+page.js` or the service worker).

Break the chain by moving the import into a server-only file and passing the data you need through a server `load` function, or by moving the code that doesn't need to be secret out of the server-only module.

## config_feature_disabled

> To enable %feature%, add the following to your SvelteKit plugin in `vite.config.js`:
>
> %config%

This feature is experimental, so you need to opt in to it before you can use it. Add the option shown in the error to the options you pass to the `sveltekit(...)` Vite plugin. See the [configuration reference](https://svelte.dev/docs/kit/@sveltejs-kit-vite) for details.

## config_file_unsupported

> `%file%` is no longer used. Please pass configuration via the `sveltekit(...)` plugin in your Vite config.

SvelteKit no longer reads `svelte.config.js`. Move your options into the `sveltekit(...)` plugin call in `vite.config.js`, then delete the old file:

```js
/// file: vite.config.js
import { sveltekit } from '@sveltejs/kit/vite';
import adapter from '@sveltejs/adapter-auto';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [
		sveltekit({
			adapter: adapter()
		})
	]
});
```

## module_removed_lib

> `$lib` has been removed. Use `#lib` instead: https://svelte.dev/docs/kit/$lib. To keep using `$lib`, add `alias: { '$lib': 'src/lib' }` to your SvelteKit config.

`#lib` is a Node [subpath import](https://nodejs.org/api/packages.html#subpath-imports), which Vite, TypeScript and other tools understand without extra configuration. Replace `$lib/...` imports with `#lib/...`. If you can't migrate yet, restore the old behaviour with the (deprecated) [`alias`](https://svelte.dev/docs/kit/@sveltejs-kit-vite#alias) option.

## module_removed_service_worker

> `$service-worker` has been removed. Use `immutable`, `assets` and `prerendered` from `$app/manifest`, `version` from `$app/env`, and `resolve(...)` from `$app/paths` instead: https://svelte.dev/docs/kit/$service-worker

The values that `$service-worker` used to provide are now available from modules that work everywhere in your app:

- `build` and `files` → `immutable` and `assets` from [`$app/manifest`](https://svelte.dev/docs/kit/$app-manifest)
- `prerendered` → `prerendered` from `$app/manifest`
- `version` → `version` from [`$app/env`](https://svelte.dev/docs/kit/$app-env)
- `base` → `resolve(...)` from [`$app/paths`](https://svelte.dev/docs/kit/$app-paths)

## service_worker_assets

> Cannot use service worker alongside `config.paths.assets`

A service worker must be served from the same origin as your app, but [`paths.assets`](https://svelte.dev/docs/kit/@sveltejs-kit-vite#paths) serves your build output from a different origin, such as a CDN. Remove `paths.assets`, or remove `src/service-worker.js` (or the file configured by [`files.serviceWorker`](https://svelte.dev/docs/kit/@sveltejs-kit-vite#files)).

## service_worker_invalid_import

> Cannot import %modules% into service-worker code.

[Service workers](https://svelte.dev/docs/kit/service-workers) run outside the page, so modules that depend on the page or the client-side router — such as `$app/forms`, `$app/navigation` and `$app/state` — aren't available there. Remove these imports from your service worker and the modules it imports.

## fetch_relative_url

> Cannot use relative URL (`%url%`) with global `fetch` — use `event.fetch` instead: https://svelte.dev/docs/kit/web-standards#Fetch-APIs

On the server there's no current page for a relative URL to be resolved against, so the global `fetch` needs an absolute URL. Inside `load` functions, actions, hooks and endpoints, use the [`fetch` provided by SvelteKit](https://svelte.dev/docs/kit/load#Making-fetch-requests) (for example `event.fetch` or the `fetch` argument of `load`) instead, which resolves relative URLs against the current request and can call your own endpoints without an HTTP round-trip.

## preview_build_missing

> Server files not found at `%dir%`, did you run `build` first?

`vite preview` serves the output of a previous production build. Run `vite build` (usually `npm run build`) before `vite preview`, and make sure both commands use the same [`outDir`](https://svelte.dev/docs/kit/@sveltejs-kit-vite#outDir).

## remote_prerender_not_dynamic

> Unexpectedly called `prerender` function. Did you forget to set `{ dynamic: true }`?

By default, [`prerender`](https://svelte.dev/docs/kit/remote-functions#prerender) functions are removed from your server bundle once their results have been prerendered, which means they can't be called with arguments that weren't prerendered. If you need to call the function at runtime, set `dynamic: true`:

```js
export const getPost = prerender(
	v.string(),
	async (slug) => {
		// ...
	},
	{ dynamic: true }
);
```

## vite_ssr_environment_not_runnable

> The configured Vite SSR environment must be a `RunnableDevEnvironment`

During development, SvelteKit runs your server code with the `ssr` environment's module runner. A Vite plugin in your config has replaced this environment with one that SvelteKit can't run code in. Remove the plugin, or configure it so it doesn't take over the `ssr` environment.

This can also happen when your project resolves more than one copy of `vite` — make sure your dependencies agree on a single version.
