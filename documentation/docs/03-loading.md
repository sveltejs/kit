---
title: Loading
---

A component that defines a page can export a `load` function that runs before the component is created. This function runs both during server-side rendering and in the client, and allows you to get data for a page without (for example) showing a loading spinner and fetching data in `onMount`.

Our example blog page might contain a `load` function like the following. Note the `context="module"` — this is necessary because `load` runs before the component is rendered:

```html
<script context="module">
	/**
	 * @param {{
	 *   page: {
	 *     host: string;
	 *     path: string;
	 *     params: Record<string, string | string[]>;
	 *     query: URLSearchParams;
	 *   };
	 *   fetch: (url: string, opts?: {...}) => Promise<Response>
	 *   session: any;
	 *   context: Record<string, any>;
	 * }} options
	 * @returns {{
	 *   status?: number;
	 *   error?: Error | string;
	 *   redirect?: string;
	 *   maxage?: number;
	 *   props?: Record<string, any>;
	 *   context?: Record<string, any>;
	 * }}
	 */
	export async function load({ page, fetch, session, context }) {
		const url = `/blog/${page.params.slug}.json`;
		const res = await fetch(url);

		if (res.ok) {
			return {
				props: {
					article: await res.json()
				}
			};
		}

		return {
			status: res.status,
			error: new Error(`Could not load ${url}`)
		};
	}
</script>
```

`load` is the SvelteKit equivalent of `getStaticProps` or `getServerSideProps` in Next.js or `asyncData` in Nuxt.js.

> `load` only applies to components that define pages, not the components that they import.

### Input

The `load` function receives an object containing four fields —  `page`, `fetch`, `session` and `context`.

#### page

`page` is a `{ host, path, params, query }` object where `host` is the URL's host, `path` is its pathname, `params` is derived from `path` and the route filename, and `query` is an instance of `URLSearchParams`.

So if the example above was `src/routes/blog/[slug].svelte` and the URL was `/blog/some-post?foo=bar&baz`, the following would be true:

- `page.path === '/blog/some-post'`
- `page.params.slug === 'some-post'`
- `page.query.get('foo') === 'bar'`
- `page.query.has('baz')`

#### fetch

`fetch` is equivalent to the native `fetch` web API, and can make credentialled requests. It can be used across both client and server contexts.

> When `fetch` runs on the server, the resulting response will be serialized and inlined into the rendered HTML. This allows the subsequent client-side `load` to access identical data immediately without an additional network request.

#### session

`session` can be used to pass data from the server related to the current request, e.g. the current user. By default it is `undefined`. [Seeding session data](#Seeding_session_data) describes how to add data to it.

#### context

`context` is passed from layout components to child layouts and page components. For the root `$layout.svelte` component, it is equal to `{}`, but if that component's `load` function returns an object with a `context` property, it will be available to subsequent `load` functions.

> It is important to note that `load` may run on either the server or in the client browser. Code called inside `load` blocks:
>
> - should run on the same domain as any upstream API servers requiring credentials
> - should not reference `window`, `document` or any browser-specific objects
> - should not reference any API keys or secrets, which will be exposed to the client

### Output

If you return a Promise from `load`, SvelteKit will delay rendering until the promise resolves. The return value has several properties, all optional:

#### status

The HTTP status code for the page. If returning an `error` this must be a `4xx` or `5xx` response; if returning a `redirect` it must be a `3xx` response. The default is `200`.

#### error

If something goes wrong during `load`, return an `Error` object or a `string` describing the error alongside a `4xx` or `5xx` status code.

#### redirect

If the page should redirect (because the page is deprecated, or the user needs to be logged in, or whatever else) return a `string` containing the location to which they should be redirected alongside a `3xx` status code.

#### maxage

To cause pages to be cached, return a `number` describing the page's max age in seconds. The resulting cache header will include `private` if user data was involved in rendering the page (either via `session`, or because a credentialled `fetch` was made in a `load` function), but otherwise will include `public` so that it can be cached by CDNs.

This only applies to page components, _not_ layout components.

#### props

If the `load` function returns a `props` object, the props will be passed to the component when it is rendered.

#### context

This will be merged with any existing `context` and passed to the `load` functions of subsequent layout and page components.

This only applies to layout components, _not_ page components.