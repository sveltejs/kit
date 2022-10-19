---
title: Loading data
---

A [`+page.svelte`](/docs/routing#page-page-svelte) or [`+layout.svelte`](/docs/routing#layout-layout-svelte) gets its `data` from a `load` function. This `load` function can be placed in `+layout.js`, `+page.js`, `+layout.server.js` or `+page.server.js`.

### Basics

A very common task is to load data prior to showing a page. For this task, use the `load` function. The following shows an example of fetching a list of all blog posts from a database inside a `+page.server.js` file which is then available through the `data` prop inside `+page.svelte`:

```js
/// file: src/routes/blog/+page.server.js
// @filename: ambient.d.ts
declare const db: { getAllBlogPosts: () => Promise<any[]> }

// @filename: index.js
// ---cut---
/** @type {import('./$types').PageServerLoad} */
export async function load() {
	return {
		posts: await db.getAllBlogPosts()
	};
}
```

```svelte
/// file: src/routes/blog/+page.svelte
<script>
	/** @type {import('./$types').PageData} */
	export let data;
</script>

{#each data.posts as post}
	...
{/each}
```

You can do the same for layouts:

```js
/// file: src/routes/blog/+layout.server.js
// @filename: ambient.d.ts
declare const db: { getBlogPostsCount: () => Promise<any[]> }

// @filename: index.js
// ---cut---
/** @type {import('./$types').LayoutServerLoad} */
export async function load() {
	return {
		postsCount: await db.getBlogPostsCount()
	};
}
```

```svelte
/// file: src/routes/blog/+layout.svelte
<script>
	/** @type {import('./$types').LayoutData} */
	export let data;
</script>

<span>{data.postsCount} blog posts available</span>
<slot />
```

Top-level promises will be awaited, which makes it easy to return multiple promises without creating a waterfall:

```js
/// file: src/routes/+page.server.js
/** @type {import('./$types').PageServerLoad} */
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

The `load` functions related to a certain page run in parallel by default, avoiding a waterfall of requests. Once all `load` functions have returned, rendering starts. This allows layouts and pages to access data from upper layouts. In the above example, the `data` prop in `blog/+page.svelte` _also_ has access to the `postsCount` returned from `blog/+layout.server.js`. Additionally, you can access the merged data of _all_ `load` functions through `$page.data`.

```svelte
/// file: src/routes/blog/+page.svelte
<script>
	import { page } from '$app/stores';

	/** @type {import('./$types').PageData} */
	export let data;
</script>

{#each data.posts as post, idx}
	<span>Post {idx + 1} of {data.postsCount}</span>
	<!-- or -->
	<span>Post {idx + 1} of {$page.data.postsCount}</span>
	...
{/each}
```

> In case `load` functions return data with the same key, the last `load` function wins.

### Using URL data

Often the `load` function depends on the URL in one way or another. For this, the `load` function provides you with `params`, `routeId` and `url`.

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

### Which load function to use

The `load` function is available in both `+page.js`/`+layout.js` and `+page.server.js`/`+layout.server.js` files. They share the same name because they do the same - providing data to a layout or page. Their capabalities differ in some ways though, and it makes sense to use one or the other depending on the situation - sometimes even both.

If the `load` function is defined in `+page.server.js` or `+layout.server.js` ("server-only `load` function") it will only run on the server, in which case it can (for example) make database calls and access private [environment variables](/docs/modules#$env-static-private). However, it can only return data that can be serialized with [devalue](https://github.com/rich-harris/devalue).

```js
/// file: src/routes/blog/+page.server.js
// @filename: ambient.d.ts
declare const db: { getAllBlogPosts: () => Promise<any[]> }

// @filename: index.js
// ---cut---
/** @type {import('./$types').PageServerLoad} */
export async function load() {
	return {
		posts: await db.getAllBlogPosts()
	};
}
```

If the `load` function is defined in `+page.js` or `+layout.js` it will by default run both on the server and in the browser ("shared `load` function"). On the initial request, the `load` function runs on the server, and again on the client during hydration with the same inputs. That way the returned data can be of any shape you like, even component constructors or class instances. For this reason (and others, see [fetch](#making-fetch-requests) for more details), if you're making a fetch request, you should use the `fetch` method that is provided to the `load` function. That way, during server-side rendering, the response will be captured and inlined into the rendered HTML. During hydration, the response will be read from the HTML, guaranteeing consistency and preventing an additional network request.

```js
/// file: src/routes/blog/+page.js
/** @type {import('./$types').PageLoad} */
export async function load({ fetch }) {
	const response = await fetch('/blog.json');
	return response.json();
}
```

You can also make `load` run on the client only by [disabling server side rendering](/docs/page-options#ssr) - so if you are building an SPA served from a static file server, you only want to use this function.

Using the shared `load` function gives you more freedom when it's run on the client as you don't have to worry about isolation of requests and can use shared variables from outside (also see [shared state](#shared-state)). It's also easier to fine-tune when the `load` function reruns and avoid network requests altogether if a `load` function doesn't need to rerun or doesn't access anything that results in a network request. At the same time you have to take the isomorphic nature of the `load` function into account. If you have things you only want to do on the client or the server, use the `browser` import from `$app/environment`.

```js
/// file: src/routes/blog/+page.js
import { browser } from '$app/environment';

// this shared variable is safe to modify on the browser, as it only affects the current user
let count = 0;

/** @type {import('./$types').PageLoad} */
export async function load() {
	// Increase count each time the load function is run, but only in the browser
	const returnedCount = count;
	if (browser) {
		count++;
	}
	return { count: returnedCount };
}
```

Sometimes it's even beneficial to use both `load` functions. For example you could first return some data from your database, and use that to create an object that is non-serializable (so therefore couldn't be returned directly from the server `load` function). To access the server data in the shared `load` function, use the `data` input:

```js
/// file: src/routes/blog/+page.server.js
// @filename: ambient.d.ts
declare const db: { getAllBlogPosts: () => Promise<any[]> }

// @filename: index.js
// ---cut---
/** @type {import('./$types').PageServerLoad} */
export async function load() {
	return {
		posts: await db.getAllBlogPosts()
	};
}
```

```js
/// file: src/routes/blog/+page.js
// @filename: ambient.d.ts
declare const Post: any;

// @filename: index.js
// @errors: 2531 7006
// ---cut---
/** @type {import('./$types').PageLoad} */
export async function load({ data }) {
	return {
		posts: data.posts.map(post => new Post(post))
	};
}
```

```svelte
/// file: src/routes/blog/+page.svelte
<script>
	/** @type {import('./$types').PageData} */
	export let data;
</script>

{#each data.posts as post}
	...
{/each}
```

To summarize:
- use server-only `load` in `+page.server.js`/`+layout.server.js` when
	- you want to access your database directly
	- you access private environment variables
	- the returned data is serializable
- use shared `load` in `+page.js`/`+layout.js` when
	- you want more control over the `load` function
	- you want to avoid a network hop when the resource is on a different server
	- you need to return non-serializable data
	- you are building an SPA served from a static file server
- use both `load` functions when you have a combination of requirements

### Making fetch requests

Inside server-only `load` functions you can directly query your database. Inside shared `load` functions you can't, as they also may run on the client. Also sometimes your database may not be on the same server as your app. For these reasons it is often necessary to make `fetch` requests.

The `load` function provides a `fetch` method which is equivalent to the [native `fetch` web API](https://developer.mozilla.org/en-US/docs/Web/API/fetch), with a few additional features:

- it can be used to make credentialed requests on the server, as it inherits the `cookie` and `authorization` headers for the page request
- it can make relative requests on the server (ordinarily, `fetch` requires a URL with an origin when used in a server context)
- internal requests (e.g. for `+server.js` routes) go direct to the handler function when running on the server, without the overhead of an HTTP call
- during server-side rendering, the response will be captured and inlined into the rendered HTML. Note that headers will _not_ be serialized, unless explicitly included via [`filterSerializedResponseHeaders`](/docs/hooks#server-hooks-handle). Then, during hydration, the response will be read from the HTML, guaranteeing consistency and preventing an additional network request - if you got a warning in your browser console when using the browser `fetch` instead of the `load` `fetch`, this is why.

> Cookies will only be passed through if the target host is the same as the SvelteKit application or a more specific subdomain of it.

### Headers and cookies

A `load` function can set headers and cookies on the server.

If you need to set headers for the response, you can do so using the `setHeaders` method. This is useful if you want the page to be cached, for example:

```js
// @errors: 2322
/// file: src/routes/blog/+page.server.js
/** @type {import('./$types').PageServerLoad} */
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

Setting the same header multiple times (even in separate `load` functions) is an error — you can only set a given header once.

You cannot add a `set-cookie` header with `setHeaders` — use the [`cookies`](/docs/types#sveltejs-kit-cookies) API in a server-only `load` function instead:

```js
// @errors: 2322
/// file: src/routes/blog/+page.server.js
/** @type {import('./$types').PageServerLoad} */
export async function load({ fetch, cookies }) {
	const url = `https://cms.example.com/articles.json`;
	const response = await fetch(url);

	cookies.set('key', 'value');

	return response.json();
}
```

`setHeaders` has no effect when a `load` function runs in the browser, and `cookies` can only be used inside a server-only `load` function.

### Using parent data

Sometimes it's useful to access the data of a parent layout `load` function, for example when you load the user data in the root layout and want to access it in different pages. For this, the `parent` method comes in handy. `await parent()` returns data from parent layout `load` functions. In `+page.server.js` or `+layout.server.js` it will return data from `load` functions in parent `+layout.server.js` files:

```js
/// file: src/routes/+layout.server.js
/** @type {import('./$types').LayoutServerLoad} */
export function load() {
	return { a: 1 };
}
```

```js
/// file: src/routes/foo/+layout.server.js
/** @type {import('./$types').LayoutServerLoad} */
export async function load({ parent }) {
	const { a } = await parent();
	console.log(a); // `1`

	return { b: 2 };
}
```

```js
/// file: src/routes/foo/+page.server.js
/** @type {import('./$types').PageServerLoad} */
export async function load({ parent }) {
	const { a, b } = await parent();
	console.log(a, b); // `1`, `2`

	return { c: 3 };
}
```

In `+page.js` or `+layout.js` it will return data from `load` functions in parent `+layout.js` files. Implicitly, a missing `+layout.js` is treated as a `({ data }) => data` function, meaning that it will also return data from parent `+layout.server.js` files.

```js
/// file: src/routes/+layout.server.js
/** @type {import('./$types').LayoutServerLoad} */
export function load() {
	return { a: 1 };
}
```

```js
/// file: src/routes/foo/+layout.js
/** @type {import('./$types').LayoutLoad} */
export async function load({ parent }) {
	const { a } = await parent();
	console.log(a); // `1`

	return { b: 2 };
}
```

```js
/// file: src/routes/foo/+page.js
/** @type {import('./$types').PageLoad} */
export async function load({ parent }) {
	const { a, b } = await parent();
	console.log(a, b); // `1`, `2`

	return { c: 3 };
}
```

Be careful not to introduce accidental waterfalls when using `await parent()`. If for example you only want to merge parent data into the returned output, call it _after_ fetching your other data.

```diff
/// file: src/routes/foo/+page.server.js
/** @type {import('./$types').PageServerLoad} */
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

### Errors

If an error is thrown during `load`, the nearest [`+error.svelte`](/docs/routing#error) will be rendered. For _expected_ errors, use the `error` helper from `@sveltejs/kit` to specify the HTTP status code and an optional message:

```js
/// file: src/routes/admin/+layout.server.js
// @filename: ambient.d.ts
declare namespace App {
	interface Locals {
		user?: {
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

If an _unexpected_ error is thrown, SvelteKit will invoke [`handleError`](/docs/hooks#shared-hooks-handleerror) and treat it as a 500 Internal Error.

### Redirects

To redirect users, use the `redirect` helper from `@sveltejs/kit` to specify the location to which they should be redirected alongside a `3xx` status code.

```js
/// file: src/routes/user/+layout.server.js
// @filename: ambient.d.ts
declare namespace App {
	interface Locals {
		user?: {
			name: string;
		}
	}
}

// @filename: index.js
// ---cut---
import { redirect } from '@sveltejs/kit';

/** @type {import('./$types').LayoutServerLoad} */
export function load({ locals }) {
	if (!locals.user) {
		throw redirect(307, '/login');
	}
}
```

### Invalidation

SvelteKit tracks the dependencies of each `load` function to avoid re-running it unnecessarily during navigation. For example, a `load` function in a root `+layout.js` doesn't need to re-run when you navigate from one page to another unless it references `url` or a member of `params` that changed since the last navigation. `load` functions also take into account parent `load` functions, if you reference them through `await parent()` - in this case, if an upper `load` function is rerun, so is the `load` function that does `await parent()`.

`load` functions do not only run when you navigate, they can also be triggered to rerun by `invalidate` or `invalidateAll` (which we get to in the next paragraph). `invalidate` is closely connected to `fetch` and `depends`, which are both methods passed to `load`. Making a `fetch` request automatically registers the fetched URL as a dependency of the load function. `depends` does the same in a manual way and registers the specified URL as a dependency. You can then use `invalidate` and pass one of the registered URLs (or a function, if you need to decide based on a pattern rather than the full URL) to it to rerun the `load` function:

```js
/// file: src/routes/items/[id]/+page.js
/** @type {import('./$types').PageLoad} */
export async function load({ fetch, depends }) {
	const response = await fetch('https://some-api.com'); // load reruns when invalidate('https://some-api.com') is called
	depends('custom:key'); // load reruns when invalidate('custom:key') is called
	return response;
}
```

```svelte
/// file: src/routes/items/[id]/+page.svelte
<script>
	import { invalidate } from '$app/navigation';
	/** @type {import('./$types').PageData} */
	export let data;

	function rerunLoadFunction() {
		invalidate('custom:key');
		// or
		invalidate('https://some-api.com');
		// or
		invalidate(url => url.href.includes('some-api'));
	}
</script>

<button on:click={rerunLoadFunction}>Rerun load function</button>
```

If you want to force a rerun of _every_ `load` function regardless of what they use, use `invalidateAll` from `$app/navigation`. This is useful for example after an update to app-wide important data like the login state.

> `invalidate(() => true)` and `invalidateAll` are _not_ the same. `invalidate(() => true)` only reruns `load` functions that have a dependency at all, `invalidateAll` also reruns `load` functions without any dependency.

To summarize, a `load` function will re-run in the following situations:

- It references a property of `params` whose value has changed
- It references a property of `url` (such as `url.pathname` or `url.search`) whose value has changed
- It calls `await parent()` and a parent `load` function re-ran
- It declared a dependency on a specific URL via [`fetch`](#making-fetch-requests) or [`depends`](/docs/types#sveltejs-kit-loadevent), and that URL was marked invalid with [`invalidate(url)`](/docs/modules#$app-navigation-invalidate)
- All active `load` functions were forcibly re-run with [`invalidateAll()`](/docs/modules#$app-navigation-invalidateall)

```js
/// file: src/routes/items/[id]/+page.js
// @filename: ambient.d.ts
declare function doStuffWith(arg: any): void;
// @filename: index.js
// ---cut---
/** @type {import('./$types').PageLoad} */
export async function load({ url, params, parent, fetch, depends }) {
	const response = await fetch('https://some-api.com'); // load reruns when invalidate('https://some-api.com') is called
	depends('custom:key'); // load reruns when invalidate('custom:key') is called
	doStuffWith(url.pathname); // load reruns when the URL changes
	doStuffWith(params.id); // load reruns when the id parameter changes
	await parent(); // load reruns when any parent load function reruns
}
```

If a `load` function is triggered to re-run and you stay on the same `+page.svelte`, the page will not remount — instead, it will update with the new `data`. This means that components' internal state is preserved. If this isn't want you want, you can reset whatever you need to reset inside an [`afterNavigate`](/docs/modules#$app-navigation-afternavigate) callback, and/or wrap your component in a [`{#key ...}`](https://svelte.dev/docs#template-syntax-key) block.

### Shared state

In many server environments, a single instance of your app will serve multiple users. For that reason, per-request state must not be stored in shared variables outside your `load` functions, but should instead be stored in `event.locals`. Similarly, per-user state must not be stored in global variables, but should instead make use of `$page.data` (which contains the combined data of all `load` functions) or use Svelte's [context feature](https://svelte.dev/docs#run-time-svelte-setcontext) to create scoped state.
