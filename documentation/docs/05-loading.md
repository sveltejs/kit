---
title: Loading
---

A page or a layout can export a `load` function from their `+page.js` or `+layout.js` file that runs before the component is created. This function runs both during server-side rendering and in the client, and allows you to fetch and manipulate data before the page is rendered, thus preventing loading spinners.

If the data for a page comes from its endpoint, you may not need a `load` function. It's useful when you need more flexibility, for example loading data from an external API, which might look like this:

```js
/// file: src/routes/blog/[slug]/+page.js
import { error } from '@sveltejs/kit';

// @filename: $types.d.ts
export type Load = import('@sveltejs/kit').Load<{ slug: string }>;

// @filename: index.js
// ---cut---
import { error } from '@sveltejs/kit';

/** @type {import('./$types').Load} */
export async function load({ params, fetch, session }) {
	const url = `https://cms.example.com/article/${params.slug}.json`;
	const response = await fetch(url);

	if (!response.ok) {
		throw error(response.status);
	}

	return {
		article: await response.json()
	};
}
```

As with [endpoints](/docs/routing#endpoints), pages can import [generated types](/docs/types#generated-types) — the `./$types` in the example above — to ensure that `params` are correctly typed.

`load` is similar to `getStaticProps` or `getServerSideProps` in Next.js, except that `load` runs on both the server and the client. In the example above, if a user clicks on a link to this page the data will be fetched from `cms.example.com` without going via our server.

SvelteKit's `load` receives an implementation of `fetch`, which has the following special properties:

- it has access to cookies on the server
- it can make requests against the app's own endpoints without issuing an HTTP call
- it makes a copy of the response when you use it, and then sends it embedded in the initial page load for hydration

`load` only applies to [pages](/docs/routing#pages) and [layouts](/docs/layouts) (not components they import), and runs on both the server and in the browser with the default rendering options.

> Code called inside `load` blocks:
>
> - should use the SvelteKit-provided [`fetch`](/docs/loading#input-fetch) wrapper rather than using the native `fetch`
> - should not reference `window`, `document`, or any browser-specific objects
> - should not directly reference any API keys or secrets, which will be exposed to the client, but instead call an endpoint that uses any required secrets

It is recommended that you not store per-request state in global variables (this also applies to writables if you instantiate a global variable with them), but instead use them only for cross-cutting concerns such as caching and holding database connections.

> Mutating any shared state on the server will affect all clients, not just the current one.

### Input

The `load` function receives an object containing eight fields — `url`, `params`, `data`, `fetch`, `session`, `parent`, `depends`, and `setHeaders`. The `load` function is reactive, and will re-run when its parameters change, but only if they are used in the function. Specifically, if `url`, `session` or `parent` are used in the function, they will be re-run whenever their value changes, and likewise for the individual properties of `params`.

> Note that destructuring parameters in the function declaration is enough to count as using them.

#### url

`url` is an instance of [`URL`](https://developer.mozilla.org/en-US/docs/Web/API/URL), containing properties like the `origin`, `hostname`, `pathname` and `searchParams` (which contains the parsed query string as a [`URLSearchParams`](https://developer.mozilla.org/en-US/docs/Web/API/URLSearchParams) object). `url.hash` cannot be accessed during `load`, since it is unavailable on the server.

> In some environments this is derived from request headers during server-side rendering. If you're using [adapter-node](/docs/adapters#supported-environments-node-js), for example, you may need to configure the adapter in order for the URL to be correct.

#### params

`params` is derived from `url.pathname` and the route filename.

For a route filename example like `src/routes/a/[b]/[...c]` and a `url.pathname` of `/a/x/y/z`, the `params` object would look like this:

```json
{
	"b": "x",
	"c": "y/z"
}
```

#### data

If the page or layout you're loading has an associated `.server` file, the data returned from it is accessible inside the `load` function as `data`. For layouts and pages without these files, `data` will be an empty object.

#### fetch

`fetch` is equivalent to the [native `fetch` web API](https://developer.mozilla.org/en-US/docs/Web/API/fetch), with a few additional features:

- it can be used to make credentialed requests on the server, as it inherits the `cookie` and `authorization` headers for the page request
- it can make relative requests on the server (ordinarily, `fetch` requires a URL with an origin when used in a server context)
- requests for endpoints go direct to the handler function during server-side rendering, without the overhead of an HTTP call
- during server-side rendering, the response will be captured and inlined into the rendered HTML
- during hydration, the response will be read from the HTML, guaranteeing consistency and preventing an additional network request

> Cookies will only be passed through if the target host is the same as the SvelteKit application or a more specific subdomain of it.

#### session

`session` can be used to pass data from the server related to the current request, e.g. the current user. By default it is `undefined`. See [`getSession`](/docs/hooks#getsession) to learn how to use it.

#### parent

`parent` is passed from layouts to descendant layouts and pages, and contains a promise of the data they return. For the root `+layout.js` component, it is equal to `Promise.resolve({})`, but if that `load` function returns data, it will be available to subsequent `load` functions.

```js
/// file: src/routes/cart/+page.js
// @errors: 2531
// @filename: ambient.d.ts
interface Cart {}
interface Item {}

declare global {
	const getCartItems: (cart: Cart) => Promise<Item[]>
}

export {};

// @filename: $types.d.ts
export type PageLoad = import('@sveltejs/kit').Load<{}>;

// @filename: index.js
// ---cut---
/** @type {import('./$types').PageLoad} */
export async function load({ parent }) {
	const user = await parent();

	return {
		items: await getCartItems(user.cart)
	};
}
```

#### depends

`depends` is a helper method which allows to declare a dependency on a specific resource. The input is one or more strings representing URLs the page depends on, which can subsequently be used with [`invalidate`](/docs/modules#$app-navigation-invalidate) to cause `load` to rerun. You only need to invoke `depends` with them if you're using a custom API client; URLs loaded with the provided `fetch` function are added automatically.

URLs can be absolute or relative to the page being loaded, and must be [encoded](https://developer.mozilla.org/en-US/docs/Glossary/percent-encoding).

```js
/// file: src/routes/blog/+page.js

// @filename: ambient.d.ts
declare global {
	const myOwnFetch: typeof fetch;
}

export {}

// @filename: $types.d.ts
export type PageLoad = import('@sveltejs/kit').Load<{}>;

// @filename: index.js
// ---cut---
/** @type {import('./$types').PageLoad} */
export async function load({ depends }) {
	const url = `https://cms.example.com/articles.json`;
	const response = await myOwnFetch(url);
	depends(url /*, url2, url3, .. */);

	return {
		article: await response.json()
	};
}
```

#### setHeaders

If you need to set headers for the response, you can do so using the `setHeaders` method. This is useful if you want to cache the response:

```js
/// file: src/routes/blog/+page.js

// @filename: $types.d.ts
export type PageLoad = import('@sveltejs/kit').Load<{}>;

// @filename: index.js
// ---cut---
/** @type {import('./$types').PageLoad} */
export async function load({ fetch, setHeaders }) {
	const url = `https://cms.example.com/articles.json`;
	const response = await fetch(url);
	setHeaders({
		// Cache the response for 300 seconds and make it public,
		// meaning it can be cached by CDNs in addition to individual browsers
		'cache-control': 'public, maxage=300'
	});

	return {
		article: await response.json()
	};
}
```

### Output

If you return a Promise from `load`, SvelteKit will delay rendering until the promise resolves. The return value will be handed to the component which can access it through the `data` prop.

```js
/// file: src/routes/blog/+page.js

// @filename: $types.d.ts
export type PageLoad = import('@sveltejs/kit').Load<{}>;

// @filename: index.js
// ---cut---
/** @type {import('./$types').PageLoad} */
export async function load() {
	return {
		article: {
			title: 'Hello',
			content: 'World'
		}
	};
}
```

```svelte
/// file: src/routes/blog/+page.svelte
<script>
	// populated with data from the load function and correctly typed
	/** @type{import('$./types').Data} */
	export let data;
</script>

<h1>{data.title}</h1>
<p>{data.content}</p>
```

#### error

If something goes wrong during `load`, throw an `error` with a `4xx` or `5xx` status code and optionally a `string` describing the error.

```js
/// file: src/routes/admin/+page.js
// @filename: $types.d.ts
export type PageLoad = import('@sveltejs/kit').Load<{}>;

// @filename: index.js
// ---cut---
import { error } from '@sveltejs/kit';

/** @type {import('./$types').PageLoad} */
export async function load({ fetch }) {
	const response = await fetch('https://secret.admin.stuff');
	if (!response.ok) {
		throw error(response.status, 'Something went wrong');
	}

	return {
		article: await response.json()
	};
}
```

#### redirect

If the page should redirect (because the page is deprecated, or the user needs to be logged in, or whatever else), throw a `redirect` containing the location to which they should be redirected alongside a `3xx` status code.

```js
/// file: src/routes/fast/+page.js
// @filename: $types.d.ts
export type PageLoad = import('@sveltejs/kit').Load<{}>;

// @filename: index.js
// ---cut---
import { redirect } from '@sveltejs/kit';

/** @type {import('./$types').PageLoad} */
export async function load({ fetch }) {
	throw redirect(301, '/faster');
}
```

The `redirect` string should be a [properly encoded](https://developer.mozilla.org/en-US/docs/Glossary/percent-encoding) URI. Both absolute and relative URIs are acceptable. You can learn more about redirects and redirect codes [here](https://developer.mozilla.org/en-US/docs/Web/HTTP/Redirections).
