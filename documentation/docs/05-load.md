---
title: Loading data
---

A [`+page.svelte`](/docs/routing#page-page-svelte) or [`+layout.svelte`](/docs/routing#layout-layout-svelte) gets its `data` from a `load` function.

If the `load` function is defined in `+page.js` or `+layout.js` it will run both on the server and in the browser. If it's instead defined in `+page.server.js` or `+layout.server.js` it will only run on the server, in which case it can (for example) make database calls and access private [environment variables](/docs/modules#$env-static-private), but can only return data that can be serialized as JSON.

```js
/// file: src/routes/+page.js
/** @type {import('./$types').PageLoad} */
export function load(event) {
	return {
		some: 'data'
	};
}
```

### Input properties

The argument to a `load` function is a `LoadEvent` (or, for server-only `load` functions, a `ServerLoadEvent` which inherits `clientAddress`, `locals`, `platform` and `request` from `RequestEvent`). All events have the following properties:

#### data

Very rarely, you might need both a `+page.js` and a `+page.server.js` (or the `+layout` equivalent). In these cases, the `data` for `+page.svelte` comes from `+page.js`, which in turn receives `data` from the server:

```js
/// file: src/routes/my-route/+page.server.js
/** @type {import('./$types').PageServerLoad} */
export function load() {
	return {
		a: 1
	};
}
```

```js
/// file: src/routes/my-route/+page.js
// @filename: $types.d.ts
export type PageLoad = import('@sveltejs/kit').Load<{}, { a: number }>;

// @filename: index.js
// ---cut---
/** @type {import('./$types').PageLoad} */
export function load({ data }) {
	return {
		b: data.a * 2
	};
}
```

```svelte
/// file: src/routes/my-route/+page.svelte
<script>
	/** @type {import('./$types').PageData} */
	export let data;

	console.log(data.a); // `undefined`, it wasn't passed through in +page.js
	console.log(data.b); // `2`
</script>
```

In other words `+page.server.js` passes `data` along to `+page.js`, which passes `data` along to `+page.svelte`.

#### params

`params` is derived from `url.pathname` and the route filename.

For a route filename example like `src/routes/a/[b]/[...c]` and a `url.pathname` of `/a/x/y/z`, the `params` object would look like this:

```json
{
	"b": "x",
	"c": "y/z"
}
```

#### routeId

The name of the current route directory, relative to `src/routes`:

```js
/// file: src/routes/blog/[slug]/+page.js
/** @type {import('./$types').PageLoad} */
export function load({ routeId }) {
	console.log(routeId); // 'blog/[slug]'
}
```

#### url

An instance of [`URL`](https://developer.mozilla.org/en-US/docs/Web/API/URL), containing properties like the `origin`, `hostname`, `pathname` and `searchParams` (which contains the parsed query string as a [`URLSearchParams`](https://developer.mozilla.org/en-US/docs/Web/API/URLSearchParams) object). `url.hash` cannot be accessed during `load`, since it is unavailable on the server.

> In some environments this is derived from request headers during server-side rendering. If you're using [adapter-node](/docs/adapters#supported-environments-node-js), for example, you may need to configure the adapter in order for the URL to be correct.

### Input methods

`LoadEvent` also has the following methods:

#### depends

This function declares that the `load` function has a _dependency_ on one or more URLs, which can subsequently be used with [`invalidate()`](/docs/modules#$app-navigation-invalidate) to cause `load` to rerun.

Most of the time you won't need this, as `fetch` calls `depends` on your behalf — it's only necessary if you're using a custom API client that bypasses `fetch`.

URLs can be absolute or relative to the page being loaded, and must be [encoded](https://developer.mozilla.org/en-US/docs/Glossary/percent-encoding).

```js
// @filename: ambient.d.ts
declare module '$lib/api' {
	interface Data{}
	export const base: string;
	export const client: {
		get: (resource:string) => Promise<Data>
	}
}

// @filename: index.js
// ---cut---
import * as api from '$lib/api';

/** @type {import('./$types').PageLoad} */
export async function load({ depends }) {
	depends(`${api.base}/foo`, `${api.base}/bar`);

	return {
		foo: api.client.get('/foo'),
		bar: api.client.get('/bar')
	};
}
```

#### fetch

`fetch` is equivalent to the [native `fetch` web API](https://developer.mozilla.org/en-US/docs/Web/API/fetch), with a few additional features:

- it can be used to make credentialed requests on the server, as it inherits the `cookie` and `authorization` headers for the page request
- it can make relative requests on the server (ordinarily, `fetch` requires a URL with an origin when used in a server context)
- internal requests (e.g. for `+server.js` routes) go direct to the handler function when running on the server, without the overhead of an HTTP call
- during server-side rendering, the response will be captured and inlined into the rendered HTML
- during hydration, the response will be read from the HTML, guaranteeing consistency and preventing an additional network request

> Cookies will only be passed through if the target host is the same as the SvelteKit application or a more specific subdomain of it.

#### parent

`await parent()` returns data from parent layout `load` functions. In `+page.server.js` or `+layout.server.js` it will return data from `load` functions in parent `+layout.server.js` files:

```js
/// file: src/routes/+layout.server.js
/** @type {import('./$types').LayoutLoad} */
export function load() {
	return { a: 1 };
}
```

```js
/// file: src/routes/foo/+layout.server.js
// @filename: $types.d.ts
export type LayoutLoad = import('@sveltejs/kit').Load<{}, null, { a: number }>;

// @filename: index.js
// ---cut---
/** @type {import('./$types').LayoutLoad} */
export async function load({ parent }) {
	const { a } = await parent();
	console.log(a); // `1`

	return { b: 2 };
}
```

```js
/// file: src/routes/foo/+page.server.js
// @filename: $types.d.ts
export type PageLoad = import('@sveltejs/kit').Load<{}, null, { a: number, b: number }>;

// @filename: index.js
// ---cut---
/** @type {import('./$types').PageLoad} */
export async function load({ parent }) {
	const { a, b } = await parent();
	console.log(a, b); // `1`, `2`

	return { c: 3 };
}
```

In `+page.js` or `+layout.js` it will return data from `load` functions in parent `+layout.js` files. Implicitly, a missing `+layout.js` is treated as a `({ data }) => data` function, meaning that it will also return data from parent `+layout.server.js` files.

Be careful not to introduce accidental waterfalls when using `await parent()`. If for example you only want to merge parent data into the returned output, call it _after_ fetching your other data.

```diff
/// file: src/routes/foo/+page.server.js
// @filename: $types.d.ts
export type PageLoad = import('@sveltejs/kit').Load<{}, null, { a: number, b: number }>;

// @filename: index.js
// ---cut---
/** @type {import('./$types').PageLoad} */
export async function load({ parent, fetch }) {
-	const parentData = await parent();
	const data = await fetch('./some-api');
+	const parentData = await parent();

	return {
		...data
		meta: { ...parentData.meta, ...data.meta }
	};
}
```

#### setHeaders

If you need to set headers for the response, you can do so using the `setHeaders` method. This is useful if you want the page to be cached, for example:

```js
/// file: src/routes/blog/+page.js
/** @type {import('./$types').PageLoad} */
export async function load({ fetch, setHeaders }) {
	const url = `https://cms.example.com/articles.json`;
	const response = await fetch(url);

	setHeaders({
		age: response.headers.get('age'),
		'cache-control': response.headers.get('cache-control')
	});

	return response.json();
}
```

> `setHeaders` has no effect when a `load` function runs in the browser.

Setting the same header multiple times (even in separate `load` functions) is an error — you can only set a given header once.

The exception is `set-cookie`, which can be set multiple times and can be passed an array of strings:

```js
/// file: src/routes/+layout.server.js
/** @type {import('./$types').LayoutLoad} */
export async function load({ setHeaders }) {
	setHeaders({
		'set-cookie': 'a=1; HttpOnly'
	});

	setHeaders({
		'set-cookie': 'b=2; HttpOnly'
	});

	setHeaders({
		'set-cookie': ['c=3; HttpOnly', 'd=4; HttpOnly']
	});
}
```

### Output

Any promises on the returned `data` object will be resolved, if they are top-level properties. This makes it easy to return multiple promises without creating a waterfall:

```js
// @filename: $types.d.ts
export type PageLoad = import('@sveltejs/kit').Load<{}>;

// @filename: index.js
// ---cut---
/** @type {import('./$types').PageLoad} */
export function load() {
	return {
		a: Promise.resolve('a'),
		b: Promise.resolve('b'),
		c: {
			value: Promise.resolve('c')
		}
	};
}
```

```svelte
<script>
	/** @type {import('./$types').PageData} */
	export let data;

	console.log(data.a); // 'a'
	console.log(data.b); // 'b'
	console.log(data.c.value); // `Promise {...}`
</script>
```

### Errors

If an error is thrown during `load`, the nearest [`+error.svelte`](/docs/routing#error) will be rendered. For _expected_ errors, use the `error` helper from `@sveltejs/kit` to specify the HTTP status code and an optional message:

```js
/// file: src/routes/admin/+layout.server.js
// @filename: ambient.d.ts
declare namespace App {
	interface Locals {
		user: {
			name: string;
			isAdmin: boolean;
		}
	}
}

// @filename: index.js
// ---cut---
import { error } from '@sveltejs/kit';

/** @type {import('./$types').LayoutServerLoad} */
export function load({ locals }) {
	if (!locals.user) {
		throw error(401, 'not logged in');
	}

	if (!locals.user.isAdmin) {
		throw error(403, 'not an admin');
	}
}
```

If an _unexpected_ error is thrown, SvelteKit will invoke [`handleError`](/docs/hooks#handleerror) and treat it as a 500 Internal Server Error.

> In development, stack traces for unexpected errors are visible as `$page.error.stack`. In production, stack traces are hidden.

### Redirects

To redirect users, use the `redirect` helper from `@sveltejs/kit` to specify the location to which they should be redirected alongside a `3xx` status code.

> There is a known bug with `redirect`: it will currently fail during client-side navigation, due to [#5952](https://github.com/sveltejs/kit/issues/5952)

```diff
/// file: src/routes/admin/+layout.server.js
-import { error } from '@sveltejs/kit';
+import { error, redirect } from '@sveltejs/kit';

/** @type {import('./$types').LayoutLoad} */
export function load({ locals }) {
	if (!locals.user) {
-		throw error(401, 'not logged in');
+		throw redirect(307, '/login');
	}

	if (!locals.user.isAdmin) {
		throw error(403, 'not an admin');
	}
}
```

### Invalidation

SvelteKit tracks the dependencies of each `load` function to avoid re-running it unnecessarily during navigation. For example, a `load` function in a root `+layout.js` doesn't need to re-run when you navigate from one page to another unless it references `url` or a member of `params` that changed since the last navigation.

A `load` function will re-run in the following situations:

- It references a property of `params` whose value has changed
- It references a property of `url` (such as `url.pathname` or `url.search`) whose value has changed
- It calls `await parent()` and a parent `load` function re-ran
- It declared a dependency on a specific URL via [`fetch`](#fetch) or [`depends`](#depends), and that URL was marked invalid with [`invalidate(url)`](/docs/modules#$app-navigation-invalidate)
- All active `load` functions were forcibly re-run with [`invalidate()`](/docs/modules#$app-navigation-invalidate)

If a `load` function is triggered to re-run, the page will not remount — instead, it will update with the new `data`. This means that components' internal state is preserved. If this isn't want you want, you can reset whatever you need to reset inside an [`afterNavigate`](/docs/modules#$app-navigation-afternavigate) callback, and/or wrap your component in a [`{#key ...}`](https://svelte.dev/docs#template-syntax-key) block.

### Shared state

In many server environments, a single instance of your app will serve multiple users. For that reason, per-request state must not be stored in shared variables outside your `load` functions, but should instead be stored in `event.locals`. Similarly, per-user state must not be stored in global variables, but should instead make use of `$page.data` (which contains the combined data of all `load` functions) or use Svelte's [context feature](https://svelte.dev/docs#run-time-svelte-setcontext) to create scoped state.
