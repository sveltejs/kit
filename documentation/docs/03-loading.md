---
title: Loading
---

A component that defines a page or a layout can export a `load` function that runs before the component is created. This function runs both during server-side rendering and in the client, and allows you to fetch and manipulate data before the page is rendered, thus preventing loading spinners.

If the data for a page comes from its endpoint, you may not need a `load` function. It's useful when you need more flexibility, for example loading data from an external API, which might look like this:

```html
/// file: src/routes/blog/[slug].svelte
<script context="module">
	/** @type {import('@sveltejs/kit').Load} */
	export async function load({ params, fetch, session, stuff }) {
		const url = `https://cms.example.com/article/${params.slug}.json`;
		const response = await fetch(url);

		return {
			status: response.status,
			props: {
				article: response.ok && (await response.json())
			}
		};
	}
</script>
```

> Note the `<script context="module">` — this is necessary because `load` runs before the component is rendered. Code that is per-component instance should go into a second `<script>` tag.

`load` is similar to `getStaticProps` or `getServerSideProps` in Next.js, except that it runs on both the server and the client. In the example above, if a user clicks on a link to this page the data will be fetched from `cms.example.com` without going via our server.

If `load` returns `{fallthrough: true}`, SvelteKit will [fall through](/docs/routing#advanced-routing-fallthrough-routes) to other routes until something responds, or will respond with a generic 404.

SvelteKit's `load` receives an implementation of `fetch`, which has the following special properties:

- it has access to cookies on the server
- it can make requests against the app's own endpoints without issuing an HTTP call
- it makes a copy of the response when you use it, and then sends it embedded in the initial page load for hydration

`load` only applies to [page](/docs/routing#pages) and [layout](/docs/layouts) components (not components they import), and runs on both the server and in the browser with the default rendering options.

> Code called inside `load` blocks:
>
> - should use the SvelteKit-provided [`fetch`](/docs/loading#input-fetch) wrapper rather than using the native `fetch`
> - should not reference `window`, `document`, or any browser-specific objects
> - should not directly reference any API keys or secrets, which will be exposed to the client, but instead call an endpoint that uses any required secrets

It is recommended that you not store pre-request state in global variables, but instead use them only for cross-cutting concerns such as caching and holding database connections.

> Mutating any shared state on the server will affect all clients, not just the current one.

### Input

The `load` function receives an object containing six fields — `url`, `params`, `props`, `fetch`, `session` and `stuff`. The `load` function is reactive, and will re-run when its parameters change, but only if they are used in the function. Specifically, if `url`, `session` or `stuff` are used in the function, they will be re-run whenever their value changes, and likewise for the individual properties of `params`.

> Note that destructuring parameters in the function declaration is enough to count as using them.

#### url

`url` is an instance of [`URL`](https://developer.mozilla.org/en-US/docs/Web/API/URL), containing properties like the `origin`, `hostname`, `pathname` and `searchParams`.

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

#### props

If the page you're loading has an endpoint, the data returned from it is accessible inside the leaf component's `load` function as `props`. For layout components and pages without endpoints, `props` will be an empty object.

#### fetch

`fetch` is equivalent to the native `fetch` web API, and can make credentialed requests. It can be used across both client and server contexts.

> When `fetch` runs on the server, the resulting response will be serialized and inlined into the rendered HTML. This allows the subsequent client-side `load` to access identical data immediately without an additional network request.

> Cookies will only be passed through if the target host is the same as the SvelteKit application or a more specific subdomain of it.

#### session

`session` can be used to pass data from the server related to the current request, e.g. the current user. By default it is `undefined`. See [`getSession`](/docs/hooks#getsession) to learn how to use it.

#### stuff

`stuff` is passed from layouts to descendant layouts and pages, and can be filled with anything else you need to make available. For the root `__layout.svelte` component, it is equal to `{}`, but if that component's `load` function returns an object with a `stuff` property, it will be available to subsequent `load` functions.

### Output

If you return a Promise from `load`, SvelteKit will delay rendering until the promise resolves. The return value has several properties, all optional:

#### status

The HTTP status code for the page. If returning an `error` this must be a `4xx` or `5xx` response; if returning a `redirect` it must be a `3xx` response. The default is `200`.

#### error

If something goes wrong during `load`, return an `Error` object or a `string` describing the error alongside a `4xx` or `5xx` status code.

#### redirect

If the page should redirect (because the page is deprecated, or the user needs to be logged in, or whatever else) return a `string` containing the location to which they should be redirected alongside a `3xx` status code.

The `redirect` string should be a [properly encoded](https://developer.mozilla.org/en-US/docs/Glossary/percent-encoding) URI. Both absolute and relative URIs are acceptable.

#### maxage

To cause pages to be cached, return a `number` describing the page's max age in seconds. The resulting cache header will include `private` if user data was involved in rendering the page (either via `session`, or because a credentialed `fetch` was made in a `load` function), but otherwise will include `public` so that it can be cached by CDNs.

This only applies to pages, _not_ layouts.

#### props

If the `load` function returns a `props` object, the props will be passed to the component when it is rendered.

#### stuff

This will be merged with any existing `stuff` and passed to the `load` functions of subsequent layout and page components.

The combined `stuff` is available to components using the [page store](/docs/modules#$app-stores) as `$page.stuff`, providing a mechanism for pages to pass data 'upward' to layouts.
