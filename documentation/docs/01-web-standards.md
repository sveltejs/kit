---
title: Web standards
---

Throughout this documentation, you'll see references to the standard [Web APIs](https://developer.mozilla.org/en-US/docs/Web/API) that SvelteKit builds on top of. Rather than reinventing the wheel, we _use the platform_, which means your existing web development skills are applicable to SvelteKit. Conversely, time spent learning SvelteKit will help you be a better web developer elsewhere.

These APIs are available in all modern browsers and in many non-browser environments like Cloudflare Workers, Deno and Vercel Edge Functions. During development, and in [adapters](/docs/adapters) for Node-based environments (including AWS Lambda), they're made available via polyfills where necessary (for now, that is — Node is rapidly adding support for more web standards).

In particular, you'll get comfortable with the following:

### Fetch APIs

SvelteKit uses [`fetch`](https://developer.mozilla.org/en-US/docs/Web/API/fetch) for getting data from the network. It's available in [hooks](/docs/hooks) and [endpoints](/docs/routing#endpoints) as well as in the browser.

> A special version of `fetch` is available in [`load`](/docs/loading) functions for accessing data directly from endpoints while preserving credentials.

Besides `fetch` itself, the [Fetch API](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API) includes the following interfaces:

#### Request

An instance of [`Request`](https://developer.mozilla.org/en-US/docs/Web/API/Request) is accessible in [hooks](/docs/hooks) and [endpoints](/docs/routing#endpoints) as `event.request`. It contains useful methods like `request.json()` and `request.formData()` for e.g. getting data that was posted to an endpoint.

#### Response

An instance of [`Response`](https://developer.mozilla.org/en-US/docs/Web/API/Response) is returned from `await fetch(...)`. Fundamentally, a SvelteKit app is a machine for turning a `Request` into a `Response`.

#### Headers

The [`Headers`](https://developer.mozilla.org/en-US/docs/Web/API/Headers) interface allows you to read incoming `request.headers` and set outgoing `response.headers`:

```js
// @errors: 2461
/// file: src/routes/what-is-my-user-agent.js
/** @type {import('@sveltejs/kit').RequestHandler} */
export function get(event) {
	// log all headers
	console.log(...event.request.headers);

	return {
		body: {
			// retrieve a specific header
			userAgent: event.request.headers.get('user-agent')
		}
	};
}
```

### URL APIs

URLs are represented by the [`URL`](https://developer.mozilla.org/en-US/docs/Web/API/URL) interface, which includes useful properties like `origin` and `pathname` (and, in the browser, `hash`). This interface shows up in various places — `event.url` in [hooks](/docs/hooks) and [endpoints](/docs/routing#endpoints), [`$page.url`](/docs/modules#$app-stores) in [pages](/docs/routing#pages), `from` and `to` in [`beforeNavigate` and `afterNavigate`](/docs/modules#$app-navigation) and so on.

#### URLSearchParams

Wherever you encounter a URL, you can access query parameters via `url.searchParams`, which is an instance of [`URLSearchParams`](https://developer.mozilla.org/en-US/docs/Web/API/URLSearchParams):

```js
// @filename: ambient.d.ts
declare global {
	const url: URL;
}

export {};

// @filename: index.js
// ---cut---
const foo = url.searchParams.get('foo');
```
