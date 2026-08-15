---
title: Migrating to SvelteKit v3
---

SvelteKit 3 removes some legacy features, moves configuration out of `svelte.config.js` into the Vite plugin, and raises the minimum version of certain dependencies. For many of these breaking changes, you can automatically migrate:

```bash
npx sv migrate sveltekit-3
```

We recommend upgrading to the most recent 2.x version before upgrading to 3.0 so that you can take advantage of targeted deprecation warnings.

## Updated dependencies

SvelteKit 3 requires the following minimum versions:

- Node v22.17
- TypeScript v6
- Svelte v5.56.4
- Vite v8.0.12 (the first Vite 8 release bundling stable `rolldown` v1)
- `@sveltejs/vite-plugin-svelte` v7

Update the versions in your `package.json` and run your package manager's install command.

## Configuration

### svelte.config.js is no longer supported

Instead of declaring project configuration in `svelte.config.js`, it must now be passed to the `sveltekit` Vite plugin in `vite.config.js`. Options that previously lived under `config.kit.*` are now top-level plugin options, alongside things like `compilerOptions`:

```js
// @errors: 2307 ignore adapter auto types missing
/// file: vite.config.js
import { defineConfig } from 'vite';
import { sveltekit } from '@sveltejs/kit/vite';
import adapter from '@sveltejs/adapter-auto';

export default defineConfig({
	plugins: [
+++		sveltekit({
			compilerOptions: { experimental: { async: true }},
			adapter: adapter()
		})+++
	]
});
```

See the [configuration docs](configuration) for further examples.

### Removed options

The following options are obsolete and should be removed from your `vite.config.js`:

- `files.lib` ([details](#$lib-is-now-lib))
- `experimental.handleRenderingErrors` is no longer required ([details](#Error-handling-Rendering-errors-are-now-handled))
- `experimental.instrumentation` is no longer required ([details](#Observability))
- `experimental.tracing` is now a top level `tracing` option ([details](#Observability))
- `vitePlugin` is removed — pass `vite-plugin-svelte` options like `inspector` directly to the plugin instead
- `preloadStrategy` is removed — `modulepreload` is now supported everywhere and so is always used
- `prerender.origin` is removed in favour of `paths.origin`
- `csrf.checkOrigin` is removed in favour of `csrf.trustedOrigins`

### Added options

- `output.linkHeaderPreload` determines whether to use `Link` HTTP headers to preload resources like `.js` and `.css` files rather than injecting `<link>` elements in the rendered HTML. This can cause issues when the headers grow too large, so SvelteKit 3 uses `<link>` elements by default instead.
- `csrf.trustedOrigins` allows you to specify external origins that are allowed to make form submissions.
- `paths.origin` replaces `prerender.origin`, and should reflect your app's public-facing origin if it can't reliably be derived from request headers (for example because it's behind a reverse proxy). It will be used for CSRF checks on form submissions and remote function calls. If using `adapter-node`, this replaces the `ORIGIN` environment variable.

### Changed options

- `version.pollInterval` now defaults to one hour, meaning SvelteKit will periodically check for new deployments and set [`updated.current`]($app-state#updated) to `true` accordingly. Previously, no polling occurred by default.

## `$lib` is now `#lib`

The `$lib` alias is no longer generated automatically by SvelteKit. It is replaced by a `#lib` alias that you declare in the [`imports`](https://nodejs.org/api/packages.html#subpath-imports) field of your `package.json`, leveraging Node's built-in subpath imports (which Vite and TypeScript resolve natively). Add this to your `package.json`...

```json
/// file: package.json
{
	"imports": {
		"#lib": "./src/lib/index.js",
		"#lib/*": "./src/lib/*"
	}
}
```

...and replace `$lib` with `#lib` across your codebase. Note that you will also have to add the module extensions (e.g. `.js` or `.ts`) to these imports.

```js
// @errors: 2307 imported module has no types
---import { foo } from '$lib/foo';---
+++import { foo } from '#lib/foo.js';+++
```

## `$app/environment` (renamed)

The `$app/environment` module has been renamed to [`$app/env`]($app-env). It can now be imported inside your service worker, where previously if you needed to access `version` you would use the now-removed [`$service-worker`](<#$service-worker-(removed)>) module.

## `$app/forms`

Forms with [`use:enhance`]($app-forms#enhance) that specify an `action` on a different page will navigate to that page upon submission, rather than staying on the current page. This ensures that the enhanced behaviour more closely matches the native, non-enhanced behaviour.

## `$app/manifest`

A new [`$app/manifest`]($app-manifest) module gives you access to metadata about your app. You can import this anywhere in your app, including in service workers for offline caching purposes, for which you would previously use the now-removed [`$service-worker`](<#$service-worker-(removed)>) module.

## `$app/navigation`

### Changes to shallow routing

For [shallow routing](shallow-routing), `pushState/replaceState` are deprecated in favor of [`goto`]($app-navigation#goto):

```js
const state = {};
import { goto } from '$app/navigation';
// ---cut---
// instead of this...
---pushState('/foo', state);---
---replaceState('/bar', state);---

// ...do this:
+++goto('/foo', { shallow: true, state });+++
+++goto('/bar', { shallow: true, replace: true, state });+++
```

A new `persistState: true` option will cause `page.state` to be reapplied following a page reload.

Shallow routing now triggers navigation hooks ([`beforeNavigate`]($app-navigation#beforeNavigate), [`onNavigate`]($app-navigation#onNavigate) and [`afterNavigate`]($app-navigation#afterNavigate)). You can filter them out by checking the `shallow` property of the object passed to those navigation hooks.

### `invalidateAll` is deprecated in favour of `refreshAll`

`invalidateAll` is deprecated in favour of [`refreshAll`]($app-navigation#refreshAll). The difference is that `refreshAll` does _not_ reset `page.state` to an empty object, which is usually what you want when using [shallow routing](shallow-routing).

Additionally, calling `invalidateAll()` or `invalidate(...)` during an in-flight navigation no longer aborts that navigation.

### `goto` options are updated

In addition to the new `shallow` option described [above](#$app-navigation-Changes-to-shallow-routing), various [`goto`]($app-navigation#goto) options have changed:

- `invalidateAll` is now `refreshAll`, to mirror the [above change](#$app-navigation-invalidateAll-is-deprecated-in-favour-of-refreshAll)
- `keepFocus: true` and `noScroll: true` have been combined as `reset: false`
- `replaceState` is now `replace`

### `goto` rejects for URLs that don't resolve to a route

`goto(...)` now rejects when called with a URL that does not resolve to a route within the app, matching the existing behaviour for external URLs. To navigate to an external URL, use `window.location.href = url`.

### `delta` only exists for `popstate` navigations

The `delta` property on navigation events ([`beforeNavigate`]($app-navigation#beforeNavigate), [`onNavigate`]($app-navigation#onNavigate) and [`afterNavigate`]($app-navigation#afterNavigate)) now only exists for `popstate` navigations (back/forward). It is `undefined` for all other navigation types.

### `preloadData` can return an `error` result

`preloadData(...)` now returns `{ type: 'error', status, error }` when the target page fails to load, instead of returning `{ type: 'loaded' }` with a 200 status. The `'redirect'` result now also includes the correct `status`. Add an `error` branch to any code that consumes the result:

```js
import { preloadData } from '$app/navigation';
const url = '/somewhere';
// ---cut---
const result = await preloadData(url);

if (result.type === 'loaded') {
	// ...
+++} else if (result.type === 'error') {
	// do something in case of an error
}+++
```

## `$app/paths`

### `base`, `assets`, and `resolveRoute` removed

The deprecated `base`, `assets`, and `resolveRoute` exports have been removed from [`$app/paths`]($app-paths). Use [`asset`]($app-paths#asset) and [`resolve`]($app-paths#resolve) instead:

```js
let base = '';
let assets = '';
let slug = '';
import { asset, resolve } from '$app/paths';
// ---cut---
// instead of this...
---const pathname = base + resolveRoute('/blog/[slug]', { slug });---
---const file = assets + '/foo.png';---

// ...do this:
+++const pathname = resolve('/blog/[slug]', { slug });+++
+++const file = asset('foo.png');+++
```

The `Pathname` and `Asset` types have also been renamed to `Path` and `AssetPath`, and the leading `/` has been removed from those types — so `asset('/foo.png')` should now be `asset('foo.png')`, and pathnames passed to `resolve` no longer start with `/` (e.g. `resolve('blog/hello-world')`). Only route IDs start with `/` now.

### Service workers can now import `$app/paths`

Previously, you needed to import `base` from the now-removed [`$service-worker`](<#$service-worker-(removed)>) module. You can now use [`asset(...)`]($app-paths#asset) and [`resolve(...)`]($app-paths#resolve) from `$app/paths`.

## `$app/service-worker`

A new [`$app/service-worker`]($app-service-worker) provides type-safe access to the service worker execution context in your `src/service-worker/index.ts`, provided you have a `src/service-worker/tsconfig.json` that extends [`$app/tsconfig/service-worker`](#$app-tsconfig-service-worker).

## `$app/state`

### `page.url` is now readonly

`page.url` is now typed as a `ReadonlyURL` with `ReadonlyURLSearchParams`, so mutating it — e.g. `page.url.searchParams.set(...)` or assigning to `page.url.pathname` — is now a type error. If you need a mutable URL, copy it first:

```js
const url = +++new URL(page.url.href);+++
url.searchParams.set('q', 'svelte');
```

### `updated` updates automatically

The `updated.current` property becomes `true` when SvelteKit detects that a new version of the app has been deployed. Previously, this would only happen following a manual `updated.check()`, or after a failed navigation. In SvelteKit 3 it happens more frequently:

- on any navigation that results in data being fetched from the server
- on any remote function call
- when the window becomes visible or focused (e.g. when switching back from another tab)
- after a polling interval (which now defaults to one hour)

Note that if you use a feature like Vercel's [skew protection](adapter-vercel#Skew-protection), passive detection on navigation and remote functions may report false negatives, since the request will be handled by the earlier deployment. Polling and event-based checks will still work, since they bypass skew protection.

## `$app/stores` (removed)

The `$app/stores` module (which exports the `$page`, `$navigating`, and `$updated` stores) has been removed. Use [`$app/state`]($app-state) instead, which provides fine-grained Svelte 5 [state](../svelte/$state), and remove the `$` prefix when reading values (i.e. `page` rather than `$page`):

```svelte
<script>
	import { page } from +++'$app/state'+++;
</script>

<p>current pathname: {page.url.pathname}</p>
```

## `$app/tsconfig`

Your project's `tsconfig.json` should now extend `$app/tsconfig` rather than `./.svelte-kit/tsconfig.json`. It should also specify `include` and `exclude` arrays, as `$app/tsconfig` does not specify these:

```json
/// file: tsconfig.json
{
	"extends": "$app/tsconfig",
	"include": ["src", "test", "*"],
	"exclude": ["src/service-worker"]
}
```

Some essential `compilerOptions` (`isolatedModules` and `verbatimModuleSyntax`) are included in `$app/tsconfig`, alongside various options that are strongly recommend but which can be overridden in your own config.

## `$app/tsconfig/service-worker`

Your service worker needs to be part of a separate TypeScript project, otherwise the types for things like `fetch` events will be incorrect. To do this, exclude the service worker from your project's root `tsconfig.json`, and add a `src/service-worker/tsconfig.json` that extends `$app/tsconfig/service-worker`:

```json
/// file: src/service-worker/tsconfig.json
{
	"extends": "$app/tsconfig/service-worker"
}
```

## `$env/...` (deprecated)

The various `$env/...` modules have been deprecated in favour of `$app/env/private` and `$app/env/public` — see [Environment variables](environment-variables) for more details.

## `$service-worker` (removed)

The `$service-worker` module has been removed. Import `version` from [`$app/env`]($app-env), `assets`, `immutable` and `prerendered` from [`$app/manifest`]($app-manifest), and `resolved` from [`$app/paths`]($app-paths) instead.

## `@sveltejs/kit`

### `error`, `isHttpError`, `redirect`, and `isRedirect` refer to public types

`error`, `isHttpError`, `redirect`, and `isRedirect` now refer to the public types rather than the internal classes. If you were importing the internal `HttpError`/`Redirect` classes from `@sveltejs/kit/internal`, or doing `instanceof` checks against them, use `isHttpError`/`isRedirect` from `@sveltejs/kit` instead.

### `json` and `text` are deprecated

The `json(...)` and `text(...)` helpers for generating responses are deprecated. Use `Response.json(...)` and `new Response(text)` instead.

### `defineParams` moved to `@sveltejs/kit/params`

The `defineParams` function for creating [param matchers](advanced-routing#Matching), along with the associated types, now live in [`@sveltejs/kit/params`](@sveltejs-kit-params).

### Env-related types moved to `@sveltejs/kit/env`

Types like `EnvVarConfig`, used with [`defineEnvVars`](@sveltejs-kit-env#defineEnvVars) hook, now live in `@sveltejs/kit/env`.

### Hooks-related types moved to `@sveltejs/kit/hooks`

Types like `Handle`, which defines the type of your [`handle`](hooks#handle) hook, now live in `@sveltejs/kit/hooks`.

### Remote function types moved to `$app/server`

Types describing remote functions, such as `RemoteQuery`, `RemoteForm` and `RemoteCommand`, now live in `$app/server` alongside the functions themselves.

## `@sveltejs/kit/hooks`

The `defineEnvVars` function has moved from `@sveltejs/kit/hooks` to `@sveltejs/kit/env`.

## `@sveltejs/kit/node`

The [`getRequest`](@sveltejs-kit-node#getRequest) and [`setResponse`](@sveltejs-kit-node#setResponse) helpers are now synchronous and no longer return Promises. Remove `await` from calls in custom Node servers or adapters.

## `@sveltejs/kit/node/polyfills` (removed)

The `@sveltejs/kit/node/polyfills` module (and the Node global shims in `adapter-node` and `adapter-netlify`) applied to Node versions that are no longer supported. Remove any `import '@sveltejs/kit/node/polyfills'` statements from your custom server code.

## Security

### `csrf.checkOrigin` replaced by `csrf.trustedOrigins`

The deprecated `csrf.checkOrigin` option has been removed. CSRF protection is always on; instead of disabling it with `checkOrigin: false`, allow trusted cross-origin hosts with `csrf.trustedOrigins`.

```js
/// file: vite.config.js
import { defineConfig } from 'vite';
import { sveltekit } from '@sveltejs/kit/vite';
// ---cut---
export default defineConfig({
	plugins: [
		sveltekit({
			csrf: {
				---checkOrigin: false---
				+++trustedOrigins: ['https://trusted-site.com']+++
			}
		})
	]
});
```

### Cross-origin form submissions require a `Content-Type` header

Cross-origin mutative requests that omit a `Content-Type` header are now rejected as CSRF. Ensure cross-origin form submissions include a `Content-Type` header, or add the origin to `csrf.trustedOrigins`.

### CORS for static assets in development is handled by Vite

SvelteKit no longer sets `access-control-allow-origin: *` on every static asset request in development. CORS is now delegated to Vite's built-in middleware. If you rely on cross-origin access to static assets in dev, configure it in your Vite config:

```js
/// file: vite.config.js
import { defineConfig } from 'vite';
// ---cut---
export default defineConfig({
	server: {
+++		cors: { origin: '*' }+++
	}
});
```

## Cookies

### Updated to `cookie` v2

SvelteKit now uses [`cookie`](https://npmx.dev/package/cookie) v2, which involves certain changes:

- cookie names can only contain ASCII characters. Non-ASCII characters (including Latin-1 Supplement characters like `á`) are rejected
- the `CookieSerializeOptions` type has been renamed to `SerializeOptions`
- the `CookieParseOptions` type has been renamed to `ParseOptions`

### Paths default to `'/'`

When setting a cookie without an explicit `path` (which was previously forbidden), the path defaults to `'/'` rather than the current request path, meaning the cookie applies to the entire site. This matches what most developers expect. You can pass an explicit `path` if necessary:

```ts
declare const cookies: import('@sveltejs/kit').Cookies;
declare const name: string;
declare const value: string;
// ---cut---
cookies.set(name, value, +++{ path: '/some/path' }+++);
```

## Error handling

### `App.Error` always includes `status`

An `App.Error` object, such as the `error` prop of an `+error.svelte` component, has a `status` property reflecting the HTTP status of the error that caused it (e.g. 404 for a Not Found error, or 500 for a generic internal error), in addition to `message` and whatever properties you define in your [`app.d.ts`](types#app.d.ts) file.

### `error(...)` arguments changed

Previously, the second argument to [`error(...)`](@sveltejs-kit#error) could be either the `message` as a `string`, or an object containing `message` alongside any additional properties defined in `app.d.ts` (such as a tracking `code`).

Now, the second argument must always be a `string`. If there are additional properties, they must be passed as a third argument.

### `handleValidationError` is removed

Validation errors are now passed to [`handleError`](hooks#handleError) with `kind: 'validation'`. The generic `{ status, message }` `error` object is safe to return, while the validation `issues` are provided separately for logging or custom handling.

### `handleError` receives all errors

In SvelteKit 2, `handleError` was not called in the case of _expected_ errors, which is to say those created with the [`error(...)`](@sveltejs-kit#error) helper. In SvelteKit 3, _all_ errors are passed to `handleError`. See the [docs](hooks#handleError) for more information.

### `handleError` can influence the status code

If you need to control the HTTP status code used to render a page in the case of an error, you can do so by returning a `status` property from `handleError` alongside any other required properties of `App.Error`.

### Rendering errors are now handled

Errors thrown during rendering are now always routed through `handleError` and then passed to the nearest [error boundary](../svelte/svelte-boundary). Error boundaries are automatically created for each of your `+error.svelte` components.

If you have an async `handleError` hook in `hooks.client.ts`, enable `compilerOptions.experimental.async` in the `sveltekit(...)` plugin options of your Vite config so it can be awaited during rendering.

### Form action responses use the `fail` status code

Enhanced form action responses now use the HTTP status code passed to `fail(...)` instead of always returning `200`. If you inspect status codes on enhanced form submissions (for example in a `use:enhance` callback or in tests), they now reflect the value passed to `fail`.

### Sourcemaps are applied

Sourcemaps are generated by default, and applied to stack traces when errors occur. For this to work in production (as opposed to `vite preview`), adapters need to avoid any destructive changes (such as rebundling without generating additional — and correct — sourcemaps). For first-party adapters this is a work in progress.

## Params

[Param matchers](advanced-routing#Matching) are no longer files inside the `src/params` directory. Declare all matchers in a single `src/params.ts` (or `src/params.js`) file using the `defineParams` helper. A matcher can be a function that returns a parsed value (or `undefined`, if the param does not match), or a [Standard Schema](https://standardschema.dev).

```js
/// file: src/params.js
import { defineParams } from '@sveltejs/kit/params';
import * as v from 'valibot';

export const params = defineParams({
	// schema variant
	integer: v.pipe(v.string(), v.toNumber()),

	// function variant
	fruit: (param) => {
		if (param === 'apple' || param === 'orange') {
			return param;
		}
	}
});
```

## Observability

Server-side [instrumentation](observability) now happens automatically if a `src/instrumentation.server.js` file exists.

To opt into [OpenTelemetry](https://opentelemetry.io/) tracing, add `tracing.server` configuration:

```js
import { defineConfig } from 'vite';
import { sveltekit } from '@sveltejs/kit/vite';
/// file: vite.config.js
// ---cut---
export default defineConfig({
	plugins: [
		sveltekit({
			+++tracing: { server: true }+++
		})
	]
});
```

## Adapters

All first-party adapters now require SvelteKit 3, alongside these adapter-specific changes:

### `adapter-cloudflare`

Cloudflare-specific APIs are no longer available on `platform`. Instead, find them where you would expect on a Cloudflare worker:

- `env`, `ctx.waitUntil`, and other `ctx` properties should be imported from `cloudflare:workers`:
```js
// @filename: ambient.d.ts
declare module 'cloudflare:workers' {
	export const env: { KV: { get(): Promise<unknown> } };
	export function waitUntil(promise: Promise<any>): void;
}
// ---cut---
import { env, waitUntil } from 'cloudflare:workers';

const value = await env.KV.get('key');
```
- `cf` is now a property of the `Request` object:
```js
/// file: src/routes/cf/+server.js
// @filename: ambient.d.ts
interface Request {
  cf: import('@cloudflare/workers-types').IncomingRequestCfProperties;
}
// @filename: index.js
// @errors: 7031
// ---cut---
export async function GET({ request }) {
	const { country } = request.cf;
}
```
- `caches` is now a global variable:
```js
/// file: src/routes/cache/+server.js
let request = new Request('');
// ---cut---
const myCache = await caches.open('foo');
await myCache.match(request);
```

- minimum `wrangler` is now `^4.67.0`
- `@cloudflare/workers-types` upgraded

### `adapter-node`

- bundling now happens with `rolldown`
- the `ORIGIN` environment variable is removed (set `paths.origin` in your Vite config instead)

### `adapter-netlify`

- output now conforms to the stable [Netlify Frameworks API](https://docs.netlify.com/build/frameworks/frameworks-api/)
- deploying/previewing with the Netlify CLI requires `v17.31.0` or later (`npm i -g netlify-cli@latest`)
- edge function build target is `es2022`

### `adapter-vercel`

- the `edge` runtime is no longer supported

### Adapter API changes

For adapter authors, there are some additional changes:

- adapters can augment the Vite config with additional plugins
- `builder.config.kit` no longer exists — the configuration now lives at the top level
- `builder.createEntries` has been removed — use `builder.writeClient`, `builder.writeServer` and `builder.writePrerendered` directly
- `builder.compress` returns a list of compressed files
- `builder.mkdirp` and `builder.rimraf` are deprecated in favour of `node:fs` methods
- `builder.generateManifest` has been removed — use `builder.generateServerInstance` to replace it, and `builder.manifest` to access the manifest

## Responses

### 204 responses return no content

Returning a `204` (or any empty `2xx`) response from a `+server.js` handler now results in a response with no body, per the HTTP spec, rather than a SvelteKit envelope. Code that consumed the body of such responses needs to handle the empty body.

### `resolve` always returns a `Promise`

The `resolve` function passed to [`handle`](hooks#handle) is now typed to always return a `Promise<Response>` rather than `MaybePromise<Response>`.

## Server-only modules

### Files

Server-only modules are now designated by a filename with a `server` segment, rather than a `.server.` infix — in other words, `stuff.server.ts`, `stuff.server.test.ts` and `server.ts` are all treated as server-only modules, whereas `server.ts` previously was not.

### Directories

Previously, any module inside `src/lib/server` was treated as server-only. This treatment now applies to _any_ `server` directory in the project with the exception of `src/routes` and your `static` directory.

## Remote functions

Remote functions are still considered experimental — opt in via the `experimental.remoteFunctions` flag alongside `compilerOptions.experimental.async`:

```js
/// file: vite.config.js
import { defineConfig } from 'vite';
import { sveltekit } from '@sveltejs/kit/vite';
// ---cut---
export default defineConfig({
	plugins: [
		sveltekit({
			compilerOptions: {
				experimental: {
					+++async: true+++
				}
			},
			experimental: {
				+++remoteFunctions: true+++
			}
		})
	]
});
```

### Remote module filenames

As with server-only modules, a `remote` segment in a filename designates a remote module — `stuff.remote.ts`, `stuff.remote.test.ts` and `remote.ts` are all remote modules.

If `experimental.remoteFunctions` is not enabled, the existence of these files will cause an error.

### `event.url`, `event.params`, and `event.route` cannot be accessed inside queries

Accessing `event.url`, `event.params`, or `event.route` inside a remote `query` function now throws an error. These properties are not meaningful in the context of a remote function (which can be called from anywhere). Pass any values you need explicitly as arguments to the function.

### Errors are typed as `App.Error | undefined`

The `error` property on remote function resources (queries, live queries, forms, prerender functions) is now typed as `App.Error | undefined` rather than `any`, as the error is always transformed by `handleError`.

### Form submissions require `field.as(...)`

A form control must use attributes from a field associated with the current `form` object:

```svelte
<input {...myform.fields.message.as('text')}>
```

Manually specifying a name (`<input name="message">`) will cause the submission to be rejected.

## Miscellaneous

### Links to the current page cause a refresh

If the user clicks a link that points to the current location, SvelteKit will `refreshAll()` instead of doing nothing.

### `data-sveltekit-*` uses `false` instead of `'off'`

The `'off'` value for `data-sveltekit-*` link attributes has been removed in favour of `false`.

```svelte
---<a href="..." data-sveltekit-preload-data="off">---
+++<a href="..." data-sveltekit-preload-data="false">+++
```

### External redirects must be opted into

To [`redirect`](@sveltejs-kit#redirect) to an external URL you must now pass an `external` option — either `true` to allow any external URL (except `javascript:` URLs, which remain blocked), or an array of allowed origins (which _can_ include `javascript:` URLs).

```js
import { redirect } from '@sveltejs/kit';
// ---cut---
redirect(307, 'https://example.com', +++{ external: true }+++);
```

### Universal `config` takes precedence over server `config`

Route `config` exported from a universal `+page.js` or `+layout.js` now takes precedence over `config` exported from the corresponding `+page.server.js` or `+layout.server.js`, matching how other page options are resolved. If you export `config` from both, move the canonical export to the universal file or consolidate them.

### Service worker registrations use `type: 'module'`

Module service workers are now widely supported. As such, SvelteKit will bundle and register your service worker as a module, rather than as a script.
