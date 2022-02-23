---
title: Routing
---

At the heart of SvelteKit is a _filesystem-based router_. This means that the structure of your application is defined by the structure of your codebase — specifically, the contents of `src/routes`.

> You can change this to a different directory by editing the [project config](/docs/configuration).

There are two types of route — **pages** and **endpoints**.

Pages typically generate HTML to display to the user (as well as any CSS and JavaScript needed for the page). By default, pages are rendered on both the client and server, though this behaviour is configurable.

Endpoints run only on the server (or when you build your site, if [prerendering](/docs/page-options#prerender)). This means it's the place to do things like access databases or APIs that require private credentials or return data that lives on a machine in your production network. Pages can request data from endpoints. Endpoints return JSON by default, though may also return data in other formats.

### Pages

Pages are Svelte components written in `.svelte` files (or any file with an extension listed in [`config.extensions`](/docs/configuration)). By default, when a user first visits the application, they will be served a server-rendered version of the page in question, plus some JavaScript that 'hydrates' the page and initialises a client-side router. From that point forward, navigating to other pages is handled entirely on the client for a fast, app-like feel where the common portions in the layout do not need to be rerendered.

The filename determines the route. For example, `src/routes/index.svelte` is the root of your site:

```html
/// file: src/routes/index.svelte
<svelte:head>
	<title>Welcome</title>
</svelte:head>

<h1>Hello and welcome to my site!</h1>
```

A file called either `src/routes/about.svelte` or `src/routes/about/index.svelte` would correspond to the `/about` route:

```html
/// file: src/routes/about.svelte
<svelte:head>
	<title>About</title>
</svelte:head>

<h1>About this site</h1>
<p>TODO...</p>
```

Dynamic parameters are encoded using `[brackets]`. For example, a blog post might be defined by `src/routes/blog/[slug].svelte`. These parameters can be accessed in a [`load`](/docs/loading#input-params) function or via the [`page`](/docs/modules#$app-stores) store.

A file or directory can have multiple dynamic parts, like `[id]-[category].svelte`. (Parameters are 'non-greedy'; in an ambiguous case like `x-y-z`, `id` would be `x` and `category` would be `y-z`.)

### Endpoints

Endpoints are modules written in `.js` (or `.ts`) files that export [request handler](/docs/types#sveltejs-kit-requesthandler) functions corresponding to HTTP methods. Their job is to make it possible to read and write data that is only available on the server (for example in a database, or on the filesystem).

```js
/// file: src/routes/items/[id].js
// @filename: ambient.d.ts
type Item = {};

declare module '$lib/database' {
	export const get: (id: string) => Promise<Item>;
}

// @filename: index.js
// ---cut---
import db from '$lib/database';

/** @type {import('@sveltejs/kit').RequestHandler} */
export async function get({ params }) {
	// `params.id` comes from [id].js
	const item = await db.get(params.id);

	if (item) {
		return {
			body: { item }
		};
	}

	return {
		status: 404
	};
};
```

> All server-side code, including endpoints, has access to `fetch` in case you need to request data from external APIs. Don't worry about the `$lib` import, we'll get to that [later](/docs/modules#$lib).

The job of a [request handler](/docs/types#sveltejs-kit-requesthandler) is to return a `{ status, headers, body }` object representing the response, where `status` is an [HTTP status code](https://httpstatusdogs.com):

- `2xx` — successful response (default is `200`)
- `3xx` — redirection (should be accompanied by a `location` header)
- `4xx` — client error
- `5xx` — server error

> If `{fallthrough: true}` is returned SvelteKit will [fall through](/docs/routing#advanced-routing-fallthrough-routes) to other routes until something responds, or will respond with a generic 404.

#### Page endpoints

If an endpoint has the same filename as a page (except for the extension), the page gets its props from the endpoint — via `fetch` during client-side navigation, or via direct function call during SSR.

A page like `src/routes/items/[id].svelte` could get its props from the `body` in the endpoint above:

```svelte
/// file: src/routes/items/[id].svelte
<script>
	// populated with data from the endpoint
	export let item;
</script>

<h1>{item.title}</h1>
```

Because the page and route have the same URL, you will need to include an `accept: application/json` header to get JSON from the endpoint rather than HTML from the page. You can also get the raw data by appending `/__data.json` to the URL, e.g. `/items/__data.json`.

#### Standalone endpoints

Most commonly, endpoints exist to provide data to the page with which they're paired. They can, however, exist separately from pages. Standalone endpoints have slightly more flexibility over the returned `body` type — in addition to objects, they can return a `Uint8Array`.

Standalone endpoints can be given a file extension if desired, or accessed directly if not:

| filename                      | endpoint   |
| ----------------------------- | ---------- |
| src/routes/data/index.json.js | /data.json |
| src/routes/data.json.js       | /data.json |
| src/routes/data/index.js      | /data      |
| src/routes/data.js            | /data      |

> Support for streaming request and response bodies is [coming soon](https://github.com/sveltejs/kit/issues/3419).

#### POST, PUT, PATCH, DELETE

Endpoints can handle any HTTP method — not just `GET` — by exporting the corresponding function:

```js
// @noErrors
export function post(event) {...}
export function put(event) {...}
export function patch(event) {...}
export function del(event) {...} // `delete` is a reserved word
```

These functions can, like `get`, return a `body` that will be passed to the page as props. Whereas 4xx/5xx responses from `get` will result in an error page rendering, similar responses to non-GET requests do not, allowing you to do things like render form validation errors:

```js
/// file: src/routes/items.js
// @filename: ambient.d.ts
type Item = {
	id: string;
};
type ValidationError = {};

declare module '$lib/database' {
	export const list: () => Promise<Item[]>;
	export const create: (request: Request) => Promise<[Record<string, ValidationError>, Item]>;
}

// @filename: index.js
// ---cut---
import * as db from '$lib/database';

/** @type {import('@sveltejs/kit').RequestHandler} */
export async function get() {
	const items = await db.list();

	return {
		body: { items }
	};
}

/** @type {import('@sveltejs/kit').RequestHandler} */
export async function post({ request }) {
	const [errors, item] = await db.create(request);

	if (errors) {
		// return validation errors
		return {
			status: 400,
			body: { errors }
		};
	}

	// redirect to the newly created item
	return {
		status: 303,
		headers: {
			location: `/items/${item.id}`
		}
	};
}
```

```svelte
/// file: src/routes/items.svelte
<script>
	// The page always has access to props from `get`...
	export let items;

	// ...plus props from `post` when the page is rendered
	// in response to a POST request, for example after
	// submitting the form below
	export let errors;
</script>

{#each items as item}
	<Preview item={item}/>
{/each}

<form method="post">
	<input name="title">

	{#if errors?.title}
		<p class="error">{errors.title}</p>
	{/if}

	<button type="submit">Create item</button>
</form>
```

#### Body parsing

The `request` object is an instance of the standard [Request](https://developer.mozilla.org/en-US/docs/Web/API/Request) class. As such, accessing the request body is easy:

```js
// @filename: ambient.d.ts
declare global {
	const create: (data: any) => any;
}

export {};

// @filename: index.js
// ---cut---
/** @type {import('@sveltejs/kit').RequestHandler} */
export async function post({ request }) {
	const data = await request.formData(); // or .json(), or .text(), etc

	await create(data);
	return { status: 201 };
}
```

#### Setting cookies

Endpoints can set cookies by returning a `headers` object with `set-cookie`. To set multiple cookies simultaneously, return an array:

```js
// @filename: ambient.d.ts
const cookie1: string;
const cookie2: string;

// @filename: index.js
// ---cut---
/** @type {import('@sveltejs/kit').RequestHandler} */
export function get() {
	return {
		headers: {
			'set-cookie': [cookie1, cookie2]
		}
	};
}
```

#### HTTP method overrides

HTML `<form>` elements only support `GET` and `POST` methods natively. You can allow other methods, like `PUT` and `DELETE`, by specifying them in your [configuration](/docs/configuration#methodoverride) and adding a `_method=VERB` parameter (you can configure the name) to the form's `action`:

```js
/// file: svelte.config.js
/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: {
		methodOverride: {
			allowed: ['PUT', 'PATCH', 'DELETE']
		}
	}
};

export default config;
```

```html
<form method="post" action="/todos/{id}?_method=PUT">
	<!-- form elements -->
</form>
```

> Using native `<form>` behaviour ensures your app continues to work when JavaScript fails or is disabled.

### Private modules

Files and directories with a leading `_` or `.` (other than [`.well-known`](https://en.wikipedia.org/wiki/Well-known_URI)) are private by default, meaning that they do not create routes (but can be imported by files that do). You can configure which modules are considered public or private with the [`routes`](/docs/configuration#routes) configuration.

### Advanced routing

#### Rest parameters

A route can have multiple dynamic parameters, for example `src/routes/[category]/[item].svelte` or even `src/routes/[category]-[item].svelte`. (Parameters are 'non-greedy'; in an ambiguous case like `/x-y-z`, `category` would be `x` and `item` would be `y-z`.) If the number of route segments is unknown, you can use rest syntax — for example you might implement GitHub's file viewer like so...

```bash
/[org]/[repo]/tree/[branch]/[...file]
```

...in which case a request for `/sveltejs/kit/tree/master/documentation/docs/01-routing.md` would result in the following parameters being available to the page:

```js
// @noErrors
{
	org: 'sveltejs',
	repo: 'kit',
	branch: 'master',
	file: 'documentation/docs/01-routing.md'
}
```

> `src/routes/a/[...rest]/z.svelte` will match `/a/z` as well as `/a/b/z` and `/a/b/c/z` and so on. Make sure you check that the value of the rest parameter is valid.

#### Sorting

It's possible for multiple routes to match a given path. For example each of these routes would match `/foo-abc`:

```bash
src/routes/[a].js
src/routes/[b].svelte
src/routes/[c].svelte
src/routes/[...catchall].svelte
src/routes/foo-[bar].svelte
```

SvelteKit needs to know which route is being requested. To do so, it sorts them according to the following rules...

- More specific routes are higher priority
- Standalone endpoints have higher priority than pages with the same specificity
- Rest parameters have lowest priority
- Ties are resolved alphabetically

...resulting in this ordering, meaning that `/foo-abc` will invoke `src/routes/foo-[bar].svelte` rather than a less specific route:

```bash
src/routes/foo-[bar].svelte
src/routes/[a].js
src/routes/[b].svelte
src/routes/[c].svelte
src/routes/[...catchall].svelte
```

#### Fallthrough routes

In rare cases, the ordering above might not be what you want for a given path. For example, perhaps `/foo-abc` should resolve to `src/routes/foo-[bar].svelte`, but `/foo-def` should resolve to `src/routes/[b].svelte`.

Higher priority routes can _fall through_ to lower priority routes by returning `{ fallthrough: true }`, either from `load` (for pages) or a request handler (for endpoints):

```svelte
/// file: src/routes/foo-[bar].svelte
<script context="module">
	export function load({ params }) {
		if (params.bar === 'def') {
			return { fallthrough: true };
		}

		// ...
	}
</script>
```

```js
/// file: src/routes/[a].js
// @errors: 2366
/** @type {import('@sveltejs/kit').RequestHandler} */
// ---cut---
export function get({ params }) {
	if (params.a === 'foo-def') {
		return { fallthrough: true };
	}

	// ...
}
```
