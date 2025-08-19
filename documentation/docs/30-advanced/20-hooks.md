---
title: Hooks
---

'Hooks' are app-wide functions you declare that SvelteKit will call in response to specific events, giving you fine-grained control over the framework's behaviour.

There are three hooks files, all optional:

- `src/hooks.server.js` — your app's server hooks
- `src/hooks.client.js` — your app's client hooks
- `src/hooks.js` — your app's hooks that run on both the client and server

Code in these modules will run when the application starts up, making them useful for initializing database clients and so on.

> [!NOTE] You can configure the location of these files with [`config.kit.files.hooks`](configuration#files).

## Server hooks

The following hooks can be added to `src/hooks.server.js`:

### handle

This function runs every time the SvelteKit server receives a [request](web-standards#Fetch-APIs-Request) — whether that happens while the app is running, or during [prerendering](page-options#prerender) — and determines the [response](web-standards#Fetch-APIs-Response). It receives an `event` object representing the request and a function called `resolve`, which renders the route and generates a `Response`. This allows you to modify response headers or bodies, or bypass SvelteKit entirely (for implementing routes programmatically, for example).

```js
/// file: src/hooks.server.js
/** @type {import('@sveltejs/kit').Handle} */
export async function handle({ event, resolve }) {
	if (event.url.pathname.startsWith('/custom')) {
		return new Response('custom response');
	}

	const response = await resolve(event);
	return response;
}
```

> [!NOTE] Requests for static assets — which includes pages that were already prerendered — are _not_ handled by SvelteKit.

If unimplemented, defaults to `({ event, resolve }) => resolve(event)`.

During prerendering, SvelteKit crawls your pages for links and renders each route it finds. Rendering the route invokes the `handle` function (and all other route dependencies, like `load`). If you need to exclude some code from running during this phase, check that the app is not [`building`]($app-environment#building) beforehand.

### locals

To add custom data to the request, which is passed to handlers in `+server.js` and server `load` functions, populate the `event.locals` object, as shown below.

```js
/// file: src/hooks.server.js
// @filename: ambient.d.ts
type User = {
	name: string;
}

declare namespace App {
	interface Locals {
		user: User;
	}
}

const getUserInformation: (cookie: string | void) => Promise<User>;

// @filename: index.js
// ---cut---
/** @type {import('@sveltejs/kit').Handle} */
export async function handle({ event, resolve }) {
	event.locals.user = await getUserInformation(event.cookies.get('sessionid'));

	const response = await resolve(event);

	// Note that modifying response headers isn't always safe.
	// Response objects can have immutable headers
	// (e.g. Response.redirect() returned from an endpoint).
	// Modifying immutable headers throws a TypeError.
	// In that case, clone the response or avoid creating a
	// response object with immutable headers.
	response.headers.set('x-custom-header', 'potato');

	return response;
}
```

You can define multiple `handle` functions and execute them with [the `sequence` helper function](@sveltejs-kit-hooks).

`resolve` also supports a second, optional parameter that gives you more control over how the response will be rendered. That parameter is an object that can have the following fields:

- `transformPageChunk(opts: { html: string, done: boolean }): MaybePromise<string | undefined>` — applies custom transforms to HTML. If `done` is true, it's the final chunk. Chunks are not guaranteed to be well-formed HTML (they could include an element's opening tag but not its closing tag, for example) but they will always be split at sensible boundaries such as `%sveltekit.head%` or layout/page components.
- `filterSerializedResponseHeaders(name: string, value: string): boolean` — determines which headers should be included in serialized responses when a `load` function loads a resource with `fetch`. By default, none will be included.
- `preload(input: { type: 'js' | 'css' | 'font' | 'asset', path: string }): boolean` — determines what files should be added to the `<head>` tag to preload it. The method is called with each file that was found at build time while constructing the code chunks — so if you for example have `import './styles.css` in your `+page.svelte`, `preload` will be called with the resolved path to that CSS file when visiting that page. Note that in dev mode `preload` is _not_ called, since it depends on analysis that happens at build time. Preloading can improve performance by downloading assets sooner, but it can also hurt if too much is downloaded unnecessarily. By default, `js` and `css` files will be preloaded. `asset` files are not preloaded at all currently, but we may add this later after evaluating feedback.

```js
/// file: src/hooks.server.js
/** @type {import('@sveltejs/kit').Handle} */
export async function handle({ event, resolve }) {
	const response = await resolve(event, {
		transformPageChunk: ({ html }) => html.replace('old', 'new'),
		filterSerializedResponseHeaders: (name) => name.startsWith('x-'),
		preload: ({ type, path }) => type === 'js' || path.includes('/important/')
	});

	return response;
}
```

Note that `resolve(...)` will never throw an error, it will always return a `Promise<Response>` with the appropriate status code. If an error is thrown elsewhere during `handle`, it is treated as fatal, and SvelteKit will respond with a JSON representation of the error or a fallback error page — which can be customised via `src/error.html` — depending on the `Accept` header. You can read more about error handling [here](errors).

### handleFetch

This function allows you to modify (or replace) the result of an [`event.fetch`](load#Making-fetch-requests) call that runs on the server (or during prerendering) inside an endpoint, `load`, `action`, `handle`, `handleError` or `reroute`.

For example, your `load` function might make a request to a public URL like `https://api.yourapp.com` when the user performs a client-side navigation to the respective page, but during SSR it might make sense to hit the API directly (bypassing whatever proxies and load balancers sit between it and the public internet).

```js
/// file: src/hooks.server.js
/** @type {import('@sveltejs/kit').HandleFetch} */
export async function handleFetch({ request, fetch }) {
	if (request.url.startsWith('https://api.yourapp.com/')) {
		// clone the original request, but change the URL
		request = new Request(
			request.url.replace('https://api.yourapp.com/', 'http://localhost:9999/'),
			request
		);
	}

	return fetch(request);
}
```

Requests made with `event.fetch` follow the browser's credentials model — for same-origin requests, `cookie` and `authorization` headers are forwarded unless the `credentials` option is set to `"omit"`. For cross-origin requests, `cookie` will be included if the request URL belongs to a subdomain of the app — for example if your app is on `my-domain.com`, and your API is on `api.my-domain.com`, cookies will be included in the request.

There is one caveat: if your app and your API are on sibling subdomains — `www.my-domain.com` and `api.my-domain.com` for example — then a cookie belonging to a common parent domain like `my-domain.com` will _not_ be included, because SvelteKit has no way to know which domain the cookie belongs to. In these cases you will need to manually include the cookie using `handleFetch`:

```js
/// file: src/hooks.server.js
// @errors: 2345
/** @type {import('@sveltejs/kit').HandleFetch} */
export async function handleFetch({ event, request, fetch }) {
	if (request.url.startsWith('https://api.my-domain.com/')) {
		request.headers.set('cookie', event.request.headers.get('cookie'));
	}

	return fetch(request);
}
```

### handleValidationError

This hook is called when a remote function is called with an argument that does not match the provided [Standard Schema](https://standardschema.dev/). It must return an object matching the shape of [`App.Error`](types#Error).

Say you have a remote function that expects a string as its argument ...

```js
/// file: todos.remote.js
import * as v from 'valibot';
import { query } from '$app/server';

export const getTodo = query(v.string(), (id) => {
	// implementation...
});
```

...but it is called with something that doesn't match the schema — such as a number (e.g `await getTodos(1)`) — then validation will fail, the server will respond with a [400 status code](https://http.dog/400), and the function will throw with the message 'Bad Request'.

To customise this message and add additional properties to the error object, implement `handleValidationError`:

```js
/// file: src/hooks.server.js
/** @type {import('@sveltejs/kit').HandleValidationError} */
export function handleValidationError({ issues }) {
	return {
		message: 'No thank you'
	};
}
```

Be thoughtful about what information you expose here, as the most likely reason for validation to fail is that someone is sending malicious requests to your server.

## Shared hooks

The following can be added to `src/hooks.server.js` _and_ `src/hooks.client.js`:

### handleError

If an [unexpected error](errors#Unexpected-errors) is thrown during loading, rendering, or from an endpoint, this function will be called with the `error`, `event`, `status` code and `message`. This allows for two things:

- you can log the error
- you can generate a custom representation of the error that is safe to show to users, omitting sensitive details like messages and stack traces. The returned value, which defaults to `{ message }`, becomes the value of `$page.error`.

For errors thrown from your code (or library code called by your code) the status will be 500 and the message will be "Internal Error". While `error.message` may contain sensitive information that should not be exposed to users, `message` is safe (albeit meaningless to the average user).

To add more information to the `$page.error` object in a type-safe way, you can customize the expected shape by declaring an `App.Error` interface (which must include `message: string`, to guarantee sensible fallback behavior). This allows you to — for example — append a tracking ID for users to quote in correspondence with your technical support staff:

```ts
/// file: src/app.d.ts
declare global {
	namespace App {
		interface Error {
			message: string;
			errorId: string;
		}
	}
}

export {};
```

```js
/// file: src/hooks.server.js
// @errors: 2322 2353
// @filename: ambient.d.ts
declare module '@sentry/sveltekit' {
	export const init: (opts: any) => void;
	export const captureException: (error: any, opts: any) => void;
}

// @filename: index.js
// ---cut---
import * as Sentry from '@sentry/sveltekit';

Sentry.init({/*...*/})

/** @type {import('@sveltejs/kit').HandleServerError} */
export async function handleError({ error, event, status, message }) {
	const errorId = crypto.randomUUID();

	// example integration with https://sentry.io/
	Sentry.captureException(error, {
		extra: { event, errorId, status }
	});

	return {
		message: 'Whoops!',
		errorId
	};
}
```

```js
/// file: src/hooks.client.js
// @errors: 2322 2353
// @filename: ambient.d.ts
declare module '@sentry/sveltekit' {
	export const init: (opts: any) => void;
	export const captureException: (error: any, opts: any) => void;
}

// @filename: index.js
// ---cut---
import * as Sentry from '@sentry/sveltekit';

Sentry.init({/*...*/})

/** @type {import('@sveltejs/kit').HandleClientError} */
export async function handleError({ error, event, status, message }) {
	const errorId = crypto.randomUUID();

	// example integration with https://sentry.io/
	Sentry.captureException(error, {
		extra: { event, errorId, status }
	});

	return {
		message: 'Whoops!',
		errorId
	};
}
```

> [!NOTE] In `src/hooks.client.js`, the type of `handleError` is `HandleClientError` instead of `HandleServerError`, and `event` is a `NavigationEvent` rather than a `RequestEvent`.

This function is not called for _expected_ errors (those thrown with the [`error`](@sveltejs-kit#error) function imported from `@sveltejs/kit`).

During development, if an error occurs because of a syntax error in your Svelte code, the passed in error has a `frame` property appended highlighting the location of the error.

> [!NOTE] Make sure that `handleError` _never_ throws an error

### init

This function runs once, when the server is created or the app starts in the browser, and is a useful place to do asynchronous work such as initializing a database connection.

> [!NOTE] If your environment supports top-level await, the `init` function is really no different from writing your initialisation logic at the top level of the module, but some environments — most notably, Safari — don't.

```js
// @errors: 2307
/// file: src/hooks.server.js
import * as db from '$lib/server/database';

/** @type {import('@sveltejs/kit').ServerInit} */
export async function init() {
	await db.connect();
}
```

> [!NOTE]
> In the browser, asynchronous work in `init` will delay hydration, so be mindful of what you put in there.

## Universal hooks

The following can be added to `src/hooks.js`. Universal hooks run on both server and client (not to be confused with shared hooks, which are environment-specific).

### reroute

This function runs before `handle` and allows you to change how URLs are translated into routes. The returned pathname (which defaults to `url.pathname`) is used to select the route and its parameters.

For example, you might have a `src/routes/[[lang]]/about/+page.svelte` page, which should be accessible as `/en/about` or `/de/ueber-uns` or `/fr/a-propos`. You could implement this with `reroute`:

```js
// @errors: 2345 2304
/// file: src/hooks.js

/** @type {Record<string, string>} */
const translated = {
	'/en/about': '/en/about',
	'/de/ueber-uns': '/de/about',
	'/fr/a-propos': '/fr/about',
};

/** @type {import('@sveltejs/kit').Reroute} */
export function reroute({ url }) {
	if (url.pathname in translated) {
		return translated[url.pathname];
	}
}
```

The `lang` parameter will be correctly derived from the returned pathname.

Using `reroute` will _not_ change the contents of the browser's address bar, or the value of `event.url`.

Since version 2.18, the `reroute` hook can be asynchronous, allowing it to (for example) fetch data from your backend to decide where to reroute to. Use this carefully and make sure it's fast, as it will delay navigation otherwise. If you need to fetch data, use the `fetch` provided as an argument. It has the [same benefits](load#Making-fetch-requests) as the `fetch` provided to `load` functions, with the caveat that `params` and `id` are unavailable to [`handleFetch`](#Server-hooks-handleFetch) because the route is not yet known.

```js
// @errors: 2345 2304
/// file: src/hooks.js

/** @type {import('@sveltejs/kit').Reroute} */
export async function reroute({ url, fetch }) {
	// Ask a special endpoint within your app about the destination
	if (url.pathname === '/api/reroute') return;

	const api = new URL('/api/reroute', url);
	api.searchParams.set('pathname', url.pathname);

	const result = await fetch(api).then(r => r.json());
	return result.pathname;
}
```


> [!NOTE] `reroute` is considered a pure, idempotent function. As such, it must always return the same output for the same input and not have side effects. Under these assumptions, SvelteKit caches the result of `reroute` on the client so it is only called once per unique URL.

### transport

This is a collection of _transporters_, which allow you to pass custom types — returned from `load` and form actions — across the server/client boundary. Each transporter contains an `encode` function, which encodes values on the server (or returns a falsy value for anything that isn't an instance of the type) and a corresponding `decode` function:

```js
// @errors: 2307
/// file: src/hooks.js
import { Vector } from '$lib/math';

/** @type {import('@sveltejs/kit').Transport} */
export const transport = {
	Vector: {
		encode: (value) => value instanceof Vector && [value.x, value.y],
		decode: ([x, y]) => new Vector(x, y)
	}
};
```


## Further reading

- [Tutorial: Hooks](/tutorial/kit/handle)
