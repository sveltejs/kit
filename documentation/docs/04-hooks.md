---
title: Hooks
---

An optional `src/hooks.js` (or `src/hooks.ts`, or `src/hooks/index.js`) file exports four functions, all optional, that run on the server — `handle`, `handleError`, `getSession`, and `externalFetch`.

> The location of this file can be [configured](/docs/configuration) as `config.kit.files.hooks`

### handle

This function runs every time SvelteKit receives a request — whether that happens while the app is running, or during [prerendering](/docs/page-options#prerender) — and determines the response. It receives an `event` object representing the request and a function called `resolve`, which invokes SvelteKit's router and generates a response (rendering a page, or invoking an endpoint) accordingly. This allows you to modify response headers or bodies, or bypass SvelteKit entirely (for implementing endpoints programmatically, for example).

```js
/// file: src/hooks.js
/** @type {import('@sveltejs/kit').Handle} */
export async function handle({ event, resolve }) {
	if (event.request.url.startsWith('/custom')) {
		return new Response('custom response');
	}

	const response = await resolve(event);
	return response;
}
```

> Requests for static assets — which includes pages that were already prerendered — are _not_ handled by SvelteKit.

If unimplemented, defaults to `({ event, resolve }) => resolve(event)`. To add custom data to the request, which is passed to endpoints, populate the `event.locals` object, as shown below.

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
	interface Platform {}
	interface Session {}
	interface Stuff {}
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

- `ssr: boolean` (default `true`) — if `false`, renders an empty 'shell' page instead of server-side rendering
- `transformPage(opts: { html: string }): string` — applies custom transforms to HTML

```js
/// file: src/hooks.js
/** @type {import('@sveltejs/kit').Handle} */
export async function handle({ event, resolve }) {
	const response = await resolve(event, {
		ssr: !event.url.pathname.startsWith('/admin'),
		transformPage: ({ html }) => html.replace('old', 'new')
	});

	return response;
}
```

> Disabling [server-side rendering](/docs/appendix#ssr) effectively turns your SvelteKit app into a [**single-page app** or SPA](/docs/appendix#csr-and-spa). In most situations this is not recommended ([see appendix](/docs/appendix#ssr)). Consider whether it's truly appropriate to disable it, and do so selectively rather than for all requests.

### handleError

If an error is thrown during rendering, this function will be called with the `error` and the `event` that caused it. This allows you to send data to an error tracking service, or to customise the formatting before printing the error to the console.

During development, if an error occurs because of a syntax error in your Svelte code, a `frame` property will be appended highlighting the location of the error.

If unimplemented, SvelteKit will log the error with default formatting.

```js
/// file: src/hooks.js
// @filename: ambient.d.ts
const Sentry: any;

// @filename: index.js
// ---cut---
/** @type {import('@sveltejs/kit').HandleError} */
export async function handleError({ error, event }) {
	// example integration with https://sentry.io/
	Sentry.captureException(error, { event });
}
```

> `handleError` is only called in the case of an uncaught exception. It is not called when pages and endpoints explicitly respond with 4xx and 5xx status codes.

### getSession

This function takes the `event` object and returns a `session` object that is [accessible on the client](/docs/modules#$app-stores) and therefore must be safe to expose to users. It runs whenever SvelteKit server-renders a page.

If unimplemented, session is `{}`.

```js
/// file: src/hooks.js
// @filename: ambient.d.ts
declare namespace App {
	interface Locals {
		user: {
			name: string;
			email: string;
			avatar: string;
			token: string;
		}
	}
	interface Session {
		user?: {
			name: string;
			email: string;
			avatar: string;
		}
	}
}

type MaybePromise<T> = T | Promise<T>;

// @filename: index.js
// ---cut---
/** @type {import('@sveltejs/kit').GetSession} */
export function getSession(event) {
	return event.locals.user
		? {
				user: {
					// only include properties needed client-side —
					// exclude anything else attached to the user
					// like access tokens etc
					name: event.locals.user.name,
					email: event.locals.user.email,
					avatar: event.locals.user.avatar
				}
		  }
		: {};
}
```

> `session` must be serializable, which means it must not contain things like functions or custom classes, just built-in JavaScript data types

### externalFetch

This function allows you to modify (or replace) a `fetch` request for an external resource that happens inside a `load` function that runs on the server (or during pre-rendering).

For example, your `load` function might make a request to a public URL like `https://api.yourapp.com` when the user performs a client-side navigation to the respective page, but during SSR it might make sense to hit the API directly (bypassing whatever proxies and load balancers sit between it and the public internet).

```js
/** @type {import('@sveltejs/kit').ExternalFetch} */
export async function externalFetch(request) {
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
