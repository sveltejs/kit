---
title: Hooks
---

An optional `src/hooks.js` (or `src/hooks.ts`, or `src/hooks/index.js`) file exports three functions, all optional, that run on the server — `handle`, `handleError` and `handleFetch`.

> The location of this file can be [configured](/docs/configuration) as `config.kit.files.hooks`

### handle

This function runs every time the SvelteKit server receives a [request](/docs/web-standards#fetch-apis-request) — whether that happens while the app is running, or during [prerendering](/docs/page-options#prerender) — and determines the [response](/docs/web-standards#fetch-apis-response). It receives an `event` object representing the request and a function called `resolve`, which renders the route and generates a `Response`. This allows you to modify response headers or bodies, or bypass SvelteKit entirely (for implementing routes programmatically, for example).

```js
/// file: src/hooks.js
/** @type {import('@sveltejs/kit').Handle} */
export async function handle({ event, resolve }) {
	if (event.url.pathname.startsWith('/custom')) {
		return new Response('custom response');
	}

	const response = await resolve(event);
	return response;
}
```

> Requests for static assets — which includes pages that were already prerendered — are _not_ handled by SvelteKit.

If unimplemented, defaults to `({ event, resolve }) => resolve(event)`. To add custom data to the request, which is passed to handlers in `+server.js` and server-only `load` functions, populate the `event.locals` object, as shown below.

```js
/// file: src/hooks.js
// @filename: ambient.d.ts
type User = {
	name: string;
}

declare namespace App {
	interface Locals {
		user: User;
	}
}

const getUserInformation: (cookie: string | null) => Promise<User>;

// declare global {
// 	const getUserInformation: (cookie: string) => Promise<User>;
// }

// @filename: index.js
// ---cut---
/** @type {import('@sveltejs/kit').Handle} */
export async function handle({ event, resolve }) {
	event.locals.user = await getUserInformation(event.request.headers.get('cookie'));

	const response = await resolve(event);
	response.headers.set('x-custom-header', 'potato');

	return response;
}
```

You can add call multiple `handle` functions with [the `sequence` helper function](/docs/modules#sveltejs-kit-hooks).

`resolve` also supports a second, optional parameter that gives you more control over how the response will be rendered. That parameter is an object that can have the following fields:

- `transformPageChunk(opts: { html: string, done: boolean }): MaybePromise<string | undefined>` — applies custom transforms to HTML. If `done` is true, it's the final chunk. Chunks are not guaranteed to be well-formed HTML (they could include an element's opening tag but not its closing tag, for example) but they will always be split at sensible boundaries such as `%sveltekit.head%` or layout/page components.

```js
/// file: src/hooks.js
/** @type {import('@sveltejs/kit').Handle} */
export async function handle({ event, resolve }) {
	const response = await resolve(event, {
		transformPageChunk: ({ html }) => html.replace('old', 'new')
	});

	return response;
}
```

### handleError

If an error is thrown during loading or rendering, this function will be called with the `error` and the `event` that caused it. This allows you to send data to an error tracking service, or to customise the formatting before printing the error to the console.

During development, if an error occurs because of a syntax error in your Svelte code, a `frame` property will be appended highlighting the location of the error.

If unimplemented, SvelteKit will log the error with default formatting.

```js
/// file: src/hooks.js
// @filename: ambient.d.ts
const Sentry: any;

// @filename: index.js
// ---cut---
/** @type {import('@sveltejs/kit').HandleError} */
export function handleError({ error, event }) {
	// example integration with https://sentry.io/
	Sentry.captureException(error, { event });
}
```

> `handleError` is only called for _unexpected_ errors. It is not called for errors created with the [`error`](/docs/modules#sveltejs-kit-error) function imported from `@sveltejs/kit`, as these are _expected_ errors.

### handleFetch

This function allows you to modify (or replace) a `fetch` request that happens inside a `load` function that runs on the server (or during pre-rendering).

For example, you might need to include custom headers that are added by a proxy that sits in front of your app:

```js
// @errors: 2345
/** @type {import('@sveltejs/kit').HandleFetch} */
export async function handleFetch({ event, request, fetch }) {
	const name = 'x-geolocation-city';
	const value = event.request.headers.get(name);
	request.headers.set(name, value);

	return fetch(request);
}
```

Or your `load` function might make a request to a public URL like `https://api.yourapp.com` when the user performs a client-side navigation to the respective page, but during SSR it might make sense to hit the API directly (bypassing whatever proxies and load balancers sit between it and the public internet).

```js
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

#### Credentials

For same-origin requests, SvelteKit's `fetch` implementation will forward `cookie` and `authorization` headers unless the `credentials` option is set to `"omit"`.

For cross-origin requests, `cookie` will be included if the request URL belongs to a subdomain of the app — for example if your app is on `my-domain.com`, and your API is on `api.my-domain.com`, cookies will be included in the request.

If your app and your API are on sibling subdomains — `www.my-domain.com` and `api.my-domain.com` for example — then a cookie belonging to a common parent domain like `my-domain.com` will _not_ be included, because SvelteKit has no way to know which domain the cookie belongs to. In these cases you will need to manually include the cookie using `handleFetch`:

```js
// @errors: 2345
/** @type {import('@sveltejs/kit').HandleFetch} */
export async function handleFetch({ event, request, fetch }) {
	if (request.url.startsWith('https://api.my-domain.com/')) {
		request.headers.set('cookie', event.request.headers.get('cookie'));
	}

	return fetch(request);
}
```
