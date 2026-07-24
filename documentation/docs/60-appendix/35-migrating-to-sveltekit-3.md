---
title: Migrating to SvelteKit v3
---

SvelteKit 3 contains many small breaking changes, most of which you probably won't notice. The minimum dependency versions have been raised, a number of long-deprecated APIs have been removed, and configuration has moved from `svelte.config.js` into the Vite plugin. This guide lists every breaking change and how to migrate.

We highly recommend upgrading to the most recent 2.x version before upgrading to 3.0, and take advantage of its deprecating warnings before upgrading.

## Updated dependency requirements

SvelteKit 3 raises the minimum supported versions of its dependencies:

- **Node** 22 or newer
- **TypeScript** 6 or newer
- **Svelte** 5.56.4 or newer
- **Vite** 8.0.12 or newer (the first Vite 8 release bundling stable `rolldown` 1.0.0)
- **`@sveltejs/vite-plugin-svelte`** v7 or newer

Update the versions in your `package.json` and run your package manager's install command.

## Configuration is now passed to the Vite plugin

`svelte.config.js` is no longer supported. SvelteKit configuration must now be passed to the `sveltekit()` Vite plugin in `vite.config.js`, and the `kit` prefix is dropped — options that used to live under `config.kit.*` are now top-level options of the plugin. They are places alongside other options such as `compilerOptions` for Svelte.

To migrate, move the contents of `svelte.config.js` into the `sveltekit()` plugin call and delete `svelte.config.js`:

```js
// --- svelte.config.js (deleted) ---
import adapterVercel from '@sveltejs/adapter-vercel';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	compilerOptions: { experimental: { async: true }},
	kit: {
		adapter: adapterVercel()
	}
};
export default config;

// --- vite.config.js ---
import { sveltekit } from '@sveltejs/kit/vite';
import adapterVercel from '@sveltejs/adapter-vercel';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [
		sveltekit(+++{
			compilerOptions: { experimental: { async: true }},
			adapter: adapterVercel()
		}+++)
	]
});
```

## `$lib` is replaced by `#lib`

The `$lib` alias is no longer generated automatically by SvelteKit. It is replaced by a `#lib` alias that you declare in the [`imports`](https://nodejs.org/api/packages.html#subpath-imports) field of your `package.json`, leveraging Node's built-in subpath imports (which Vite and TypeScript resolve natively).

```json
{
	"imports": {
		"#lib": "./src/lib/index.js",
		"#lib/*": "./src/lib/*"
	}
}
```

```js
---import { foo } from '$lib/foo.js';---
+++import { foo } from '#lib/foo.js';+++
```

Consequently, the `kit.files.lib` configuration option has also been removed — `src/lib` is no longer special-cased by SvelteKit.

To migrate, find-and-replace `$lib` with `#lib` across your codebase, add the `imports` entry above to `package.json`, and remove any `files.lib` config.

## Param matchers live in a single `params.js/ts` file

Param matchers are no longer files inside the `src/params/` directory. Declare all matchers in a single `src/params.js` (or `src/params.ts`) file using the `defineParams` helper. A matcher can be a function that returns a parsed value (or `undefined` to not match), or a [Standard Schema](https://standardschema.dev).

```js
// --- src/params/integer.js (deleted) ---
export function match(param) {
	return /^\d+$/.test(param);
}

// --- src/params.js ---
import { defineParams } from '@sveltejs/kit';
import * as v from 'valibot';

export const params = defineParams({
	integer: v.pipe(v.string(), v.toNumber()), // schema variant
	fruit: (param) => (param === 'apple' || param === 'orange' ? param : undefined) // function variant
});
```

To migrate, consolidate every `src/params/*.js` file into `src/params.js`/`params.ts`. When a matcher returns a parsed value (or a Standard Schema is used), the route `params` are now typed with the output type.

## `$app/stores` has been removed

`$app/stores` (the `$page`, `$navigating`, and `$updated` stores) has been removed. Use `$app/state` instead, which is based on the Svelte 5 runes API and provides fine-grained, non-store values.

```svelte
<script>
	---import { page } from '$app/stores';---
+++import { page } from '$app/state';+++
</script>

---{$page.data}---
+++{page.data}+++
```

Replace `$app/stores` imports with `$app/state` and remove the `$` prefix when reading values.

## `base`, `assets`, and `resolveRoute` removed from `$app/paths`

The deprecated `base`, `assets`, and `resolveRoute` exports have been removed from `$app/paths`. Use the replacements that were introduced in SvelteKit 2.26:

- `resolveRoute(id, params)` → `resolve(id, params)` (also accepts a plain pathname)
- `assets + '/foo.png'` → `asset('foo.png')`

```js
---import { base, resolveRoute } from '$app/paths';---
+++import { resolve } from '$app/paths';+++

---const path = base + resolveRoute('/blog/[slug]', { slug });---
+++const path = resolve('/blog/[slug]', { slug });+++
```

The `Pathname` and `Asset` types have also been renamed to `Path` and `AssetPath`, and the leading `/` has been removed from those types — so `asset('/foo.png')` should now be `asset('foo.png')`, and pathnames passed to `resolve` no longer start with `/` (e.g. `resolve('blog/hello-world')`). Only route ids start with `/` now.

## Changes to shallow routing

`pushState/replaceState` are deprecated in favor of `goto`:

```js
import { goto, pushState, replaceState } from '$app/navigation';

---pushState('/foo', state);---
+++goto('/foo', { shallow: true, state });+++

---replaceState('/bar', state);---
+++goto('/bar', { shallow: true, replace: true, state });+++
```

Shallow routing now triggers navigation hooks (`before/after/onNavigate`). You can filter them out by checking the `shallow` property of the object passed to those navigation hooks.

## External redirects must be opted into

`redirect(...)` to an external URL is now forbidden by default. To redirect to an external destination, pass an `external` option — either `true` to allow any external URL (except `javascript:` URLs, which are always blocked), or an array of allowed origins (through which you can allow `javascript:` URLs).

```js
import { redirect } from '@sveltejs/kit';

---throw redirect(307, 'https://example.com');---
+++throw redirect(307, 'https://example.com', { external: true });+++
```

## `invalidateAll` is deprecated in favour of `refreshAll`

`invalidateAll` is deprecated in favour of `refreshAll`. The difference is that `refreshAll` does _not_ reset `page.state` to an empty object, which is usually what you want when using [shallow routing](shallow-routing). The `goto(..., { invalidateAll })` option is likewise deprecated in favour of `refreshAll`.

```js
import { +++refreshAll+++ } from '$app/navigation';

---await invalidateAll();---
+++await refreshAll();+++
```

Calling `invalidate(All)` during an in-flight navigation no longer aborts that navigation.

## `handleError` can influence the status code

`handleError` can now return a `status` property to override the response status code, and `App.Error` now always includes a `status: number` property. `status` is a reserved key on the returned object and is set by the framework — if your `App.Error` type previously declared its own `status` field for other purposes, rename it.

```js
export async function handleError({ error, event, status, message }) {
	return {
		+++status: 418,+++
		message: 'something went wrong'
	};
}
```

## Rendering errors now handled

The `experimental.handleRenderingErrors` flag has been removed; errors thrown during rendering are now always routed through `handleError` and then passed to the nearest error boundary, which can also be a `+error.svelte`. Remove the flag from your config. If your client `handleError` hook is `async`, enable `compilerOptions.experimental.async` in the SvelteKit plugin options so it can be awaited during rendering.

## Tracing is no longer experimental

Server-side tracing is no longer configured under `experimental.tracing`/`experimental.instrumentation`. `src/instrumentation.server.js` is now included in the build automatically when it exists, and tracing is configured at the top level via `tracing.server`.

```js
experimental: {
	---tracing: { server: true }---
}
+++tracing: {
	server: true
}+++
```

## Adapters

All first-party adapters now require SvelteKit 3. The deprecated `builder.createEntries` method has also been removed from the `Builder` object passed to adapters — use `builder.writeClient`/`builder.writeServer`/`builder.writePrerendered` directly.

Adapter-specific breaking changes:

- **`adapter-cloudflare`** — minimum `wrangler` is now `^4.67.0`; `@cloudflare/workers-types` upgraded; `platform.context` removed in favour of `platform.ctx`.
- **`adapter-node`** — bundled with `rolldown`; the `ORIGIN` environment variable is removed (use `paths.origin` in config).
- **`adapter-netlify`** — output now conforms to the stable [Netlify Frameworks API](https://docs.netlify.com/build/frameworks/frameworks-api/); deploying/previewing with the Netlify CLI requires `v17.31.0` or later (`npm i -g netlify-cli@latest`); edge function build target is `es2022`.
- **`adapter-vercel`** — edge function build target is now `es2022`; edge functions are bundled with `rolldown`.

## Routing and project structure

### Consistent special filename patterns

Special filenames are now matched on a _segment_ basis rather than only via the `*.server.*` / `*.remote.*` infix. A `server` segment anywhere in a file's path makes it server-only, and a `remote` segment anywhere in the path makes it a remote module.

This means `*.remote.*.ts` now works the same way `*.server.*.ts` always has, and bare files named `server.ts` or `remote.ts` are now treated as special (previously they were not). If you have a file named `server.ts` or `remote.ts` that should _not_ be treated as server-only/remote, rename it.

### Server-only directories

Any directory named `server` in the path is now treated as server-only everywhere in the project, not just `$lib/server`; with the exception of `src/routes` and the assets directory.

If you have a `server/` directory that is meant to be importable from client code, rename it. Otherwise this change simply expands protection against accidentally importing server code into the browser.

### Universal `config` takes precedence over server `config`

`config` exported from a universal `+page.js`/`+layout.js` now takes precedence over `config` exported from the corresponding `+page.server.js`/`+layout.server.js`, matching how other page options are resolved. If you export `config` from both, move the canonical export to the universal file or consolidate them.

## Modules and imports

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

```js
cookies.set(name, value, +++{ path: '/some/path' }+++);
```

## Responses and error handling

### 204 responses return no content

Returning a `204` (or any empty `2xx`) response from a `+server.js` handler now results in a response with no body, per the HTTP spec, rather than a SvelteKit envelope. Code that consumed the body of such responses needs to handle the empty body.

### Form action responses use the `fail` status code

Enhanced form action responses now use the HTTP status code passed to `fail(...)` instead of always returning `200`. If you inspect status codes on enhanced form submissions (for example in a `use:enhance` callback or in tests), they now reflect the value passed to `fail`.

### `getRequest` and `setResponse` are synchronous

The `getRequest` and `setResponse` helpers from `@sveltejs/kit/node` are now synchronous and no longer return Promises. Remove `await` from calls in custom Node servers or adapters:

```js
---const request = await getRequest(req);---
---await setResponse(res, response);---
+++const request = getRequest(req);+++
+++setResponse(res, response);+++
```

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
export default defineConfig({
	server: {
+++		cors: { origin: '*' }+++
	}
});
```

## Remote functions

### Remote functions require an opt-in

Files matching `*.remote.ts`/`*.remote.js` now error during development and builds unless `experimental.remoteFunctions` is enabled. As such they are now reserved for remote functions.

### `event.url`, `event.params`, and `event.route` cannot be accessed inside queries

Accessing `event.url`, `event.params`, or `event.route` inside a remote `query` function now throws an error. These properties are not meaningful in the context of a remote function (which can be called from anywhere). Pass any values you need explicitly as arguments to the function.

## Removed and reorganised configuration options

### `output.preloadStrategy` removed

The `preloadStrategy` option has been removed. `modulepreload` is always used. Remove `output.preloadStrategy` from your config.

### `prerender.origin` replaced by `paths.origin`

`prerender.origin` has been removed in favour of `paths.origin`, which is also used as the trusted self-origin for CSRF checks on form submissions and remote function calls. The `adapter-node` `ORIGIN` environment variable has also been removed — set `paths.origin` in your config instead.

```js
prerender: {
	---origin: 'https://example.com'---
},
+++paths: {
	origin: 'https://example.com'
},+++
```

### `output.linkHeaderPreload`

Preloading via the `Link` response header is no longer the default (it broke common self-hosted reverse proxies). Dynamically rendered pages now preload via `<link>` elements in the HTML instead. If you relied on the `Link` header, opt back in:

```js
output: {
+++	linkHeaderPreload: true+++
}
```
