---
title: Loading
---

A component that defines a page or a layout can export a `load` function that runs before the component is created. This function runs both during server-side rendering and in the client, and allows you to get data for a page without (for example) showing a loading spinner and fetching data in `onMount`.

```ts
type LoadInput<
	PageParams extends Record<string, string> = Record<string, string>,
	Context extends Record<string, any> = Record<string, any>,
	Session = any
> = {
	page: {
		host: string;
		path: string;
		params: PageParams;
		query: URLSearchParams;
	};
	fetch: (info: RequestInfo, init?: RequestInit) => Promise<Response>;
	session: Session;
	context: Context;
};

type LoadOutput<
	Props extends Record<string, any> = Record<string, any>,
	Context extends Record<string, any> = Record<string, any>
> = {
	status?: number;
	error?: string | Error;
	redirect?: string;
	props?: Props;
	context?: Context;
	maxage?: number;
};

```

Our example blog page might contain a `load` function like the following. Note the `context="module"` — this is necessary because `load` runs before the component is rendered:

```html
<script context="module">
	/**
	 * @type {import('@sveltejs/kit').Load}
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

`load` is similar to `getStaticProps` or `getServerSideProps` in Next.js, except that it runs on both the server and the client.

If `load` returns nothing, SvelteKit will [fall through](#routing-advanced-fallthrough-routes) to other routes until something responds, or will respond with a generic 404.

> `load` only applies to components that define pages, not the components that they import.
>
> It is important to note that `load` may run on either the server or in the client browser. Code called inside `load` blocks:
>
> - should use the SvelteKit-provided [`fetch`](#loading-input-fetch) method for getting data in order to avoid duplicate network requests
> - should generally run on the same domain as any upstream API servers requiring credentials
> - should not reference `window`, `document`, or any browser-specific objects
> - should not reference any API keys or secrets directly, which will be exposed to the client, but instead call an endpoint using any required secrets

### Input

The `load` function receives an object containing four fields — `page`, `fetch`, `session` and `context`. The `load` function is reactive, and will re-run when its parameters change, but only if they are used in the function. Specifically, if `page.query`, `page.path`, `session`, or `context` are used in the function, they will be re-run whenever their value changes. Note that destructuring parameters in the function declaration is enough to count as using them. In the example above, the `load({ page, fetch, session, context })` function will re-run every time `session` or `context` is changed, even though they are not used in the body of the function. If it was re-written as `load({ page, fetch })`, then it would only re-run when `page.params.slug` changes. The same reactivity applies to `page.params`, but only to the params actually used in the function. If `page.params.foo` changes, the example above would not re-run, because it did not access `page.params.foo`, only `page.params.slug`.

#### page

`page` is a `{ host, path, params, query }` object where `host` is the URL's host, `path` is its pathname, `params` is derived from `path` and the route filename, and `query` is an instance of [`URLSearchParams`](https://developer.mozilla.org/en-US/docs/Web/API/URLSearchParams).

So if the example above was `src/routes/blog/[slug].svelte` and the URL was `https://example.com/blog/some-post?foo=bar&baz&bizz=a&bizz=b`, the following would be true:

- `page.host === 'example.com'`
- `page.path === '/blog/some-post'`
- `page.params.slug === 'some-post'`
- `page.query.get('foo') === 'bar'`
- `page.query.has('baz')`
- `page.query.getAll('bizz') === ['a', 'b']`

#### fetch

`fetch` is equivalent to the native `fetch` web API, and can make credentialed requests. It can be used across both client and server contexts.

> When `fetch` runs on the server, the resulting response will be serialized and inlined into the rendered HTML. This allows the subsequent client-side `load` to access identical data immediately without an additional network request.

> Cookies will only be passed through if the target host is the same as the SvelteKit application or a more specific subdomain of it.

#### session

`session` can be used to pass data from the server related to the current request, e.g. the current user. By default it is `undefined`. See [`getSession`](#hooks-getsession) to learn how to use it.

#### context

`context` is passed from layout components to child layouts and page components. For the root `__layout.svelte` component, it is equal to `{}`, but if that component's `load` function returns an object with a `context` property, it will be available to subsequent `load` functions.

### Output

If you return a Promise from `load`, SvelteKit will delay rendering until the promise resolves. The return value has several properties, all optional:

#### status

The HTTP status code for the page. If returning an `error` this must be a `4xx` or `5xx` response; if returning a `redirect` it must be a `3xx` response. The default is `200`.

#### error

If something goes wrong during `load`, return an `Error` object or a `string` describing the error alongside a `4xx` or `5xx` status code.

#### redirect

If the page should redirect (because the page is deprecated, or the user needs to be logged in, or whatever else) return a `string` containing the location to which they should be redirected alongside a `3xx` status code.

#### maxage

To cause pages to be cached, return a `number` describing the page's max age in seconds. The resulting cache header will include `private` if user data was involved in rendering the page (either via `session`, or because a credentialed `fetch` was made in a `load` function), but otherwise will include `public` so that it can be cached by CDNs.

This only applies to page components, _not_ layout components.

#### props

If the `load` function returns a `props` object, the props will be passed to the component when it is rendered.

#### context

This will be merged with any existing `context` and passed to the `load` functions of subsequent layout and page components.

This only applies to layout components, _not_ page components.
