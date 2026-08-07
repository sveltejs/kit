---
title: Migrating to SvelteKit v3
---

SvelteKit 3 removes some legacy features, moves configuration out of `svelte.config.js` into the Vite plugin, and raises the minimum version of certain dependencies. For many of these breaking changes, you can automatically migrate:

```bash
npx sv migrate sveltekit-3
```

We recommend upgrading to the most recent 2.x version before upgrading to 3.0 so that you can take advantage of targeted deprecation warnings.

## Updated dependency requirements

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

- `files.lib` (see [`$lib is now `#lib`](#$lib-is-now-lib))
- TODO others

## `$lib` is now `#lib`

The `$lib` alias is no longer generated automatically by SvelteKit. It is replaced by a `#lib` alias that you declare in the [`imports`](https://nodejs.org/api/packages.html#subpath-imports) field of your `package.json`, leveraging Node's built-in subpath imports (which Vite and TypeScript resolve natively).

```json
/// file: package.json
{
	"imports": {
		"#lib": "./src/lib/index.js",
		"#lib/*": "./src/lib/*"
	}
}
```

Consequently, the `kit.files.lib` configuration option has also been removed — `src/lib` is no longer special-cased by SvelteKit.

To migrate, find-and-replace `$lib` with `#lib` across your codebase, add the `imports` entry above to `package.json`, and remove any `files.lib` config.

## Param matchers live in a single `params.ts` file

Param matchers are no longer files inside the `src/params` directory. Declare all matchers in a single `src/params.ts` (or `src/params.js`) file using the `defineParams` helper. A matcher can be a function that returns a parsed value (or `undefined`, if the param does not match), or a [Standard Schema](https://standardschema.dev).

```js
/// file: src/params.js
import { defineParams } from '@sveltejs/kit';
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

To migrate, consolidate every `src/params/*.js` file into `src/params.js`/`params.ts`. See [Matching](advanced-routing#Matching) for more details.

## `$app/stores` has been removed

The `$app/stores` module (which exports the `$page`, `$navigating`, and `$updated` stores) has been removed. Use [`$app/state`]($app-state) instead, which provides fine-grained Svelte 5 [state](../svelte/$state).

```svelte
<script>
	import { page } from +++'$app/state'+++;
</script>

<p>current pathname: {page.url.pathname}</p>
```

Replace `$app/stores` imports with `$app/state` and remove the `$` prefix when reading values (i.e. `page` rather than `$page`).

## `$app/paths` changes

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

See the section on [service workers](#Service-workers) below for more details.

## `$app/navigation` changes

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

```js
import { +++refreshAll+++ } from '$app/navigation';

---await invalidateAll();---
+++await refreshAll();+++
```

Calling `invalidate(All)` during an in-flight navigation no longer aborts that navigation.

### `goto` options are updated

In addition to the new `shallow` option described [above]($app-navigation-changes-Changes-to-shallow-routing), various [`goto`]($app-navigation#goto) options have changed:

- `invalidateAll` is now `refreshAll`, to mirror the [above change]($app-navigation-changes-invalidateAll-is-deprecated-in-favour-of-refreshAll)
- `keepFocus: true` and `noScroll: true` have been combined as `reset: false`
- `replaceState` is now `replace`


## External redirects must be opted into

To [`redirect`](@sveltejs-kit#redirect) to an external URL you must now pass an `external` option — either `true` to allow any external URL (except `javascript:` URLs, which remain blocked), or an array of allowed origins (which _can_ include `javascript:` URLs).

```js
import { redirect } from '@sveltejs/kit';
// ---cut---
redirect(307, 'https://example.com', +++{ external: true }+++);
```

## Error handling

### `App.Error` always includes `status`

An `App.Error` object, such as the `error` prop of an `+error.svelte` component, has a `status` property reflecting the HTTP status of the error that caused it (e.g. 404 for a Not Found error, or 500 for a generic internal error), in addition to `message` and whatever properties you define in your [`app.d.ts`](types#app.d.ts) file.

### `error(...)` arguments changed

Previously, the second argument to [`error(...)`](@sveltejs-kit#error) could be either the `message` as a `string`, or an object containing `message` alongside any additional properties defined in `app.d.ts` (such as a tracking `code`).

Now, the second argument must always be a `string`. If there are additional properties, they must be passed as a third argument.

### `handleValidationError` is removed

Validation errors are now passed to [`handleError`](hooks#handleError), with `kind: 'validation'`.

### `handleError` receives all errors

In SvelteKit 2, `handleError` was not called in the case of _expected_ errors, which is to say those created with the [`error(...)`](@sveltejs-kit#error) helper. In SvelteKit 3, _all_ errors are passed to `handleError`. See the [docs](hooks#handleError) for more information.

### `handleError` can influence the status code

If you need to control the HTTP status code used to render a page in the case of an error, you can do so by returning a `status` property from `handleError` alongside any other required properties of `App.Error`.

### Rendering errors are now handled

The `experimental.handleRenderingErrors` flag has been removed and should be deleted from your config.

Errors thrown during rendering are now always routed through `handleError` and then passed to the nearest [error boundary](../svelte/svelte-boundary). Error boundaries are automatically created for each of your `+error.svelte` components.

If you have an async `handleError` hook in `hooks.client.ts`, enable `compilerOptions.experimental.async` in the `sveltekit(...)` plugin options of your Vite config so it can be awaited during rendering.

## Tracing is no longer experimental

Server-side [OpenTelemetry tracing](observability) is no longer configured under the `experimental.tracing` and `experimental.instrumentation` flags. `src/instrumentation.server.js` is now included in the build automatically when it exists, and tracing is configured at the top level via `tracing.server`:

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

  - minimum `wrangler` is now `^4.67.0`
  - `@cloudflare/workers-types` upgraded
  - `platform.context` removed in favour of `platform.ctx`

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

- `builder.createEntries` has been removed — use `builder.writeClient`, `builder.writeServer` and `builder.writePrerendered` directly
- TODO



## Routing and project structure

### Consistent special filename patterns

Server-only modules are now designated by a filename with a `server` segment, rather than a `.server.` infix — in other words, `stuff.server.ts`, `stuff.server.test.ts` and `server.ts` are all treated as server-only modules, whereas `server.ts` previously was not.

Similarly, a `remote` segment in a filename designates a remote module — `stuff.remote.ts`, `stuff.remote.test.ts` and `remote.ts` are all remote modules.

### Server-only directories

Previously, any module inside `src/lib/server` was treated as server-only. This treatment now applies to _any_ `server` directory in the project with the exception of `src/routes` and your `static` directory.

### Universal `config` takes precedence over server `config`

Route `config` exported from a universal `+page.js` or `+layout.js` now takes precedence over `config` exported from the corresponding `+page.server.js` or `+layout.server.js`, matching how other page options are resolved. If you export `config` from both, move the canonical export to the universal file or consolidate them.

## Modules and imports

### `$service-worker` has been removed

Use `immutable`, `assets` and `prerendered` from `$app/manifest` in place of `build`, `files` and `prerendered`. `version` now comes from `$app/env`, and `resolve(...)` from `$app/paths` replaces `base`.

```js
---import { build, files, version } from '$service-worker';---
+++import { immutable, assets } from '$app/manifest';
import { version } from '$app/env';+++
```

### `@sveltejs/kit/node/polyfills` has been removed

The `@sveltejs/kit/node/polyfills` module (and the Node global shims in `adapter-node`/`adapter-netlify`) have been removed. They were only needed for older Node versions, which are no longer supported. Remove any `import '@sveltejs/kit/node/polyfills'` statements from your custom server code.

### `defineEnvVars` moved to `@sveltejs/kit/env`

`defineEnvVars` is no longer exported from `@sveltejs/kit/hooks`. Import it from `@sveltejs/kit/env` instead.

```js
---import { defineEnvVars } from '@sveltejs/kit/hooks';---
+++import { defineEnvVars } from '@sveltejs/kit/env';+++
```

### `data-sveltekit-*` uses `false` instead of `'off'`

The `'off'` value for `data-sveltekit-*` link attributes has been removed in favour of `false`.

```svelte
---<a href="..." data-sveltekit-preload-data="off">---
+++<a href="..." data-sveltekit-preload-data="false">+++
```

### `error`, `isHttpError`, `redirect`, and `isRedirect` refer to public types

`error`, `isHttpError`, `redirect`, and `isRedirect` now refer to the public types rather than the internal classes. If you were importing the internal `HttpError`/`Redirect` classes from `@sveltejs/kit/internal`, or doing `instanceof` checks against them, use `isHttpError`/`isRedirect` from `@sveltejs/kit` instead.

## Navigation and data loading

### `goto` rejects for URLs that don't resolve to a route

`goto(...)` now rejects when called with a URL that does not resolve to a route within the app, matching the existing behaviour for external URLs. Ensure `goto` targets correspond to real routes. To navigate to an external URL, use `window.location.href = url`.

### `delta` only exists for `popstate` navigations

The `delta` property on navigation events (`beforeNavigate`/`afterNavigate`/`onNavigate`) now only exists for `popstate` navigations (back/forward). It is `undefined` for all other navigation types.

### `preloadData` can return an `'error'` result

`preloadData(...)` now returns `{ type: 'error', status, error }` when the target page fails to load, instead of returning `{ type: 'loaded' }` with a 200 status. The `'redirect'` result now also includes the correct `status`. Add an `error` branch to any code that consumes the result:

```js
import { preloadData } from '$app/navigation';
const url = '/somewhere';
// ---cut---
const result = await preloadData(url);

if (result.type === 'loaded') {
	// ...
} +++else if (result.type === 'error') {
	// do something in case of an error
}+++
```

### `page.url` is now immutable on the type level

`page.url` (from `$app/state`) is now typed as a `ReadonlyURL` with `ReadonlyURLSearchParams`, so mutating it — e.g. `page.url.searchParams.set(...)` or assigning to `page.url.pathname` — is now a type error. If you need a mutable URL, copy it first:

```js
const url = +++new URL(+++page.url.href+++);+++
url.searchParams.set('q', 'svelte');
```

## Cookies

### Cookie names must be ASCII

SvelteKit now uses `cookie` v2, which requires cookie names to contain only ASCII characters. Non-ASCII characters (including Latin-1 Supplement characters like `á`) are rejected. Rename any non-ASCII cookie names to ASCII equivalents. If you depended on the `CookieSerializeOptions`/`CookieParseOptions` types, import `SerializeOptions`/`ParseOptions` from `cookie` instead.

### The cookie `path` option defaults to `'/'`

When setting a cookie without an explicit `path`, the path now defaults to `'/'` (the whole site) rather than the current request path. This matches what most developers expect. If you relied on the previous implicit behaviour, pass an explicit `path`:

```ts
declare const cookies: import('@sveltejs/kit').Cookies;
declare const name: string;
declare const value: string;
// ---cut---
cookies.set(name, value, +++{ path: '/some/path' }+++);
```

## Responses and error handling

### 204 responses return no content

Returning a `204` (or any empty `2xx`) response from a `+server.js` handler now results in a response with no body, per the HTTP spec, rather than a SvelteKit envelope. Code that consumed the body of such responses needs to handle the empty body.

### Form action responses use the `fail` status code

Enhanced form action responses now use the HTTP status code passed to `fail(...)` instead of always returning `200`. If you inspect status codes on enhanced form submissions (for example in a `use:enhance` callback or in tests), they now reflect the value passed to `fail`.

### `getRequest` and `setResponse` are synchronous

The `getRequest` and `setResponse` helpers from `@sveltejs/kit/node` are now synchronous and no longer return Promises. Remove `await` from calls in custom Node servers or adapters:

### `handle`'s `resolve` always returns a `Promise`

The `resolve` function passed to `handle` is now typed to always return a `Promise<Response>` rather than `MaybePromise<Response>`. If you wrap `resolve` in a custom function that returns a bare `Response`, make the wrapper `async` or wrap the return value in `Promise.resolve(...)`.

### `form.error` is typed as `App.Error | undefined`

The `error` property on remote function resources (queries, live queries, forms, prerender functions) is now typed as `App.Error | undefined` rather than `any`. Because all errors are transformed through `handleError` before surfacing, the value is always `App.Error`-shaped.

## Security

### `csrf.checkOrigin` replaced by `csrf.trustedOrigins`

The deprecated `csrf.checkOrigin` option has been removed. CSRF protection is always on; instead of disabling it with `checkOrigin: false`, allowlist trusted cross-origin hosts with `csrf.trustedOrigins`.

```js
csrf: {
	---checkOrigin: false---
	+++trustedOrigins: ['https://trusted-site.com']+++
}
```

### Cross-origin form submissions require a `Content-Type` header

Cross-origin form submissions that omit a `Content-Type` header are now rejected as CSRF, where previously they were allowed through ([#16347](https://github.com/sveltejs/kit/pull/16347)). Ensure cross-origin form submissions include a `Content-Type` header, or add the origin to `csrf.trustedOrigins`.

### CORS for static assets in development is handled by Vite

SvelteKit no longer sets `access-control-allow-origin: *` on every static asset request in development. CORS is now delegated to Vite's built-in middleware. If you rely on cross-origin access to static assets in dev, configure it in your Vite config:

```js
import { defineConfig } from 'vite';
// ---cut---
export default defineConfig({
	server: {
+++		cors: { origin: '*' }+++
	}
});
```

## Remote functions

### Remote functions require an opt-in

Files with a `remote` segment in the name now error during development and builds unless `experimental.remoteFunctions` is enabled. As such they are now reserved for remote functions.

### `event.url`, `event.params`, and `event.route` cannot be accessed inside queries

Accessing `event.url`, `event.params`, or `event.route` inside a remote `query` function now throws an error. These properties are not meaningful in the context of a remote function (which can be called from anywhere). Pass any values you need explicitly as arguments to the function.

## Removed and reorganised configuration options

### `output.preloadStrategy` removed

The `preloadStrategy` option has been removed. `modulepreload` is always used. Remove `output.preloadStrategy` from your config.

### `prerender.origin` replaced by `paths.origin`

`prerender.origin` has been removed in favour of `paths.origin`, which is also used as the trusted self-origin for CSRF checks on form submissions and remote function calls. The `adapter-node` `ORIGIN` environment variable has also been removed — set `paths.origin` in your config instead.

```js
/// file: vite.config.js
import { defineConfig } from 'vite';
import { sveltekit } from '@sveltejs/kit/vite';

export default defineConfig({
	plugins: [
		sveltekit({
			prerender: {
				---origin: 'https://example.com'---
			},
			paths: {
				+++origin: 'https://example.com'+++
			}
		})
	]
});
```

### `output.linkHeaderPreload`

Preloading via the `Link` response header is no longer the default (it broke common self-hosted reverse proxies). Dynamically rendered pages now preload via `<link>` elements in the HTML instead. If you relied on the `Link` header, opt back in:

```js
output: {
+++	linkHeaderPreload: true+++
}
```
