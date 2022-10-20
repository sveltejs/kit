---
title: Loading data
---

Before a [`+page.svelte`](/docs/routing#page-page-svelte) component (and its containing [`+layout.svelte`](/docs/routing#layout-layout-svelte) components) can be rendered, we often need to get some data. This is done by defining `load` functions.

### Page data

A `+page.svelte` file can have a sibling `+page.js` (or `+page.ts`) that exports a `load` function, the return value of which is available to the page via the `data` prop:

```js
/// file: src/routes/blog/[slug]/+page.js
/** @type {import('./$types').PageLoad} */
export function load({ params }) {
	return {
		post: {
			title: `Title for ${params.slug} goes here`,
			content: `Content for ${params.slug} goes here`
		}
	};
}
```

```svelte
/// file: src/routes/blog/[slug]/+page.svelte
<script>
	/** @type {import('./$types').PageData} */
	export let data;
</script>

<h1>{data.post.title}</h1>
<div>{@html data.post.content}</div>
```

Thanks to the generated `$types` module, we get full type safety.

A `load` function in a `+page.js` file runs both on the server and in the browser. If your `load` function should _always_ run on the server (because it uses private environment variables, for example, or accesses a database) then you can put it in a `+page.server.js` instead.

A more realistic version of your blog post's `load` function, that pulls data from a database, might look like this:

```js
/// file: src/routes/blog/[slug]/+page.server.js
// @filename: ambient.d.ts
declare module '$lib/server/database' {
	export function getPost(slug: string): Promise<{ title: string, content: string }>
}

// @filename: index.js
// ---cut---
import * as db from '$lib/server/database';

/** @type {import('./$types').PageServerLoad} */
export async function load({ params }) {
	return {
		post: await db.getPost(params.slug)
	};
}
```

Notice that the type changed from `PageLoad` to `PageServerLoad`, because server-only `load` functions can access additional arguments. To understand when to use `+page.js` and when to use `+page.server.js`, see [Shared vs server](/docs/load#shared-vs-server).

### Layout data

Your `+layout.svelte` files can also load data, via `+layout.js` or `+layout.server.js`.

```js
/// file: src/routes/blog/[slug]/+layout.server.js
// @filename: ambient.d.ts
declare module '$lib/server/database' {
	export function getPosts(): Promise<Array<{ title: string, slug: string }>>
}

// @filename: index.js
// ---cut---
import * as db from '$lib/server/database';

/** @type {import('./$types').LayoutServerLoad} */
export async function load() {
	return {
		posts: await db.getPosts()
	};
}
```

```svelte
/// file: src/routes/blog/[slug]/+layout.svelte
<script>
	/** @type {import('./$types').LayoutData} */
	export let data;
</script>

<main>
	<slot />
</main>

<aside>
	<h2>More posts</h2>
	<ul>
		{#each data.posts as post}
			<li>
				<a href="/blog/{post.slug}">
					{post.title}
				</a>
			</li>
		{/each}
	</ul>
</aside>
```

Data returned from layout `load` functions is available to child `+layout.svelte` components and the `+page.svelte` component as well as the layout that it 'belongs' to.

```diff
/// file: src/routes/blog/[slug]/+page.svelte
<script>
+	import { page } from '$app/stores';

	/** @type {import('./$types').PageData} */
	export let data;

+	// we can access `data.posts` because it's returned from
+	// the parent layout `load` function
+	$: index = data.posts.findIndex(post => post.slug === page.params.slug);
+	$: next = data.posts[index - 1];
</script>

<h1>{data.post.title}</h1>
<div>{@html data.post.content}</div>

+{#if next}
+	<p>Next post: <a href="/blog/{next.slug}">{next.title}</a></p>
+{/if}
```

> If multiple `load` functions return data with the same key, the last one 'wins'.

### $page.data

The `+page.svelte` component, and each `+layout.svelte` component above it, has access to its own data plus all the data from its parents.

In some cases, a parent layout might need to access page data or data from a child layout — for example, the root layout might want to access a `title` property returned from a `load` function in `+page.js` or `+page.server.js`. This can be done with `$page.data`:

```svelte
/// file: src/routes/+layout.svelte
<script>
	import { page } from '$app/stores';
</script>

<svelte:head>
	<title>{$page.data.title}</title>
</svelte:head>
```

Type information for `$page.data` is provided by `App.PageData`.

### Shared vs server

As we've seen, there are two types of `load` function:

* `+page.js` and `+layout.js` files export `load` functions that are _shared_ between server and browser
* `+page.server.js` and `+layout.server.js` files export `load` functions that are _server-only_

Conceptually, they're the same thing, but there are some important differences to be aware of.

#### Input

Both shared and server-only `load` functions have access to properties describing the request (`params`, `routeId` and `url`) and various functions (`depends`, `fetch` and `parent`). These are described in the following sections.

Server-only `load` functions are called with a `ServerLoadEvent`, which inherits `clientAddress`, `cookies`, `locals`, `platform` and `request` from `RequestEvent`.

Shared `load` functions are called with a `LoadEvent`, which has a `data` property. If you have `load` functions in both `+page.js` and `+page.server.js` (or `+layout.js` and `+layout.server.js`), the return value of the server-only `load` function is the `data` property of the shared `load` function's argument.

#### Output

A shared `load` function can return an object containing any values, including things like custom classes and component constructors.

A server-only `load` function must return data that can be serialized with [devalue](https://github.com/rich-harris/devalue) — anything that can be represented as JSON plus things like `BigInt`, `Date`, `Map`, `Set` and `RegExp`, or repeated/cyclical references — so that it can be transported over the network.

#### When to use which

Server-only `load` functions are convenient when you need to access data directly from a database or filesystem, or need to use private environment variables.

Shared `load` functions are useful when you need to `fetch` data from an external API and don't need private credentials, since SvelteKit can get the data directly from the API rather than going via your server. They are also useful when you need to return something that can't be serialized, such as a Svelte component constructor.

In rare cases, you might need to use both together — for example, you might need to return an instance of a custom class that was initialised with data from your server.

### Using URL data

Often the `load` function depends on the URL in one way or another. For this, the `load` function provides you with `url`, `routeId` and `params`.

#### url

An instance of [`URL`](https://developer.mozilla.org/en-US/docs/Web/API/URL), containing properties like the `origin`, `hostname`, `pathname` and `searchParams` (which contains the parsed query string as a [`URLSearchParams`](https://developer.mozilla.org/en-US/docs/Web/API/URLSearchParams) object). `url.hash` cannot be accessed during `load`, since it is unavailable on the server.

> In some environments this is derived from request headers during server-side rendering. If you're using [adapter-node](/docs/adapters#supported-environments-node-js), for example, you may need to configure the adapter in order for the URL to be correct.

#### routeId

The name of the current route directory, relative to `src/routes`:

```js
/// file: src/routes/a/[b]/[...c]/+page.js
/** @type {import('./$types').PageLoad} */
export function load({ routeId }) {
	console.log(routeId); // 'a/[b]/[...c]'
}
```

#### params

`params` is derived from `url.pathname` and `routeId`.

Given a `routeId` of `a/[b]/[...c]` and a `url.pathname` of `/a/x/y/z`, the `params` object would look like this:

```json
{
	"b": "x",
	"c": "y/z"
}
```

### Making fetch requests

To get data from an external API or a `+server.js` handler, you can use the provided `fetch` function, which behaves identically to the [native `fetch` web API](https://developer.mozilla.org/en-US/docs/Web/API/fetch) with a few additional features:

- it can be used to make credentialed requests on the server, as it inherits the `cookie` and `authorization` headers for the page request
- it can make relative requests on the server (ordinarily, `fetch` requires a URL with an origin when used in a server context)
- internal requests (e.g. for `+server.js` routes) go direct to the handler function when running on the server, without the overhead of an HTTP call
- during server-side rendering, the response will be captured and inlined into the rendered HTML. Note that headers will _not_ be serialized, unless explicitly included via [`filterSerializedResponseHeaders`](/docs/hooks#server-hooks-handle). Then, during hydration, the response will be read from the HTML, guaranteeing consistency and preventing an additional network request - if you got a warning in your browser console when using the browser `fetch` instead of the `load` `fetch`, this is why.

```js
/// file: +page.js
/** @type {import('./$types').PageLoad} */
export async function load({ fetch, params }) {
	const res = await fetch(`/api/items/${params.id}`);
	const item = await res.json();

	return {
		item
	};
}
```

> Cookies will only be passed through if the target host is the same as the SvelteKit application or a more specific subdomain of it.

### Cookies and headers

A server-only `load` function can get and set [`cookies`](/docs/types#sveltejs-kit-cookies).

```js
/// file: src/routes/+layout.server.js
// @filename: ambient.d.ts
declare module '$lib/server/database' {
	export function getUser(sessionid: string): Promise<{ name: string, avatar: string }>
}

// @filename: index.js
// ---cut---
import * as db from '$lib/server/database';

/** @type {import('./$types').LayoutServerLoad} */
export async function load({ cookies }) {
	const sessionid = cookies.get('sessionid');

	return {
		user: await db.getUser(sessionid)
	};
}
```

Both server-only and shared `load` functions have access to a `setHeaders` function that, when running on the server, can set headers for the response. (When running in the browser, `setHeaders` has no effect.) This is useful if you want the page to be cached, for example:

```js
// @errors: 2322
/// file: src/routes/blog/+page.js
/** @type {import('./$types').PageLoad} */
export async function load({ fetch, setHeaders }) {
	const url = `https://cms.example.com/articles.json`;
	const response = await fetch(url);

	// cache the page for the same length of time
	// as the underlying data
	setHeaders({
		age: response.headers.get('age'),
		'cache-control': response.headers.get('cache-control')
	});

	return response.json();
}
```

Setting the same header multiple times (even in separate `load` functions) is an error — you can only set a given header once. You cannot add a `set-cookie` header with `setHeaders` — use `cookies` instead.

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

### Promise unwrapping

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

### Parallel loading

When rendering (or navigating to) a page, SvelteKit runs all `load` functions concurrently, avoiding a waterfall of requests. (During client-side navigation, the result of calling multiple server-only `load` functions are grouped into a single response.) Once all `load` functions have returned, the page is rendered.

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

In many server environments, a single instance of your app will serve multiple users. For that reason, per-request or per-user state must not be stored in shared variables outside your `load` functions, but should instead be stored in `event.locals`.