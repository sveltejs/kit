---
title: Routing
---

At the heart of SvelteKit is a _filesystem-based router_. This means that the structure of your application is defined by the structure of your codebase — specifically, the contents of `src/routes`.

> You can change this to a different directory by editing the [project config](#configuration).

There are two types of route — **pages** and **endpoints**.

Pages typically generate HTML to display to the user (as well as any CSS and JavaScript needed for the page). By default, pages are rendered on both the client and server, though this behaviour is configurable.

Endpoints run only on the server (or when you build your site, if [prerendering](#page-options-prerender)). This means it's the place to do things like access databases or APIs that require private credentials or return data that lives on a machine in your production network. Pages can request data from endpoints. Endpoints return JSON by default, though may also return data in other formats.

### Pages

Pages are Svelte components written in `.svelte` files (or any file with an extension listed in [`config.extensions`](#configuration)). By default, when a user first visits the application, they will be served a server-rendered version of the page in question, plus some JavaScript that 'hydrates' the page and initialises a client-side router. From that point forward, navigating to other pages is handled entirely on the client for a fast, app-like feel where the common portions in the layout do not need to be rerendered.

The filename determines the route. For example, `src/routes/index.svelte` is the root of your site:

```html
<!-- src/routes/index.svelte -->
<svelte:head>
	<title>Welcome</title>
</svelte:head>

<h1>Hello and welcome to my site!</h1>
```

A file called either `src/routes/about.svelte` or `src/routes/about/index.svelte` would correspond to the `/about` route:

```html
<!-- src/routes/about.svelte -->
<svelte:head>
	<title>About</title>
</svelte:head>

<h1>About this site</h1>
<p>TODO...</p>
```

Dynamic parameters are encoded using `[brackets]`. For example, a blog post might be defined by `src/routes/blog/[slug].svelte`.

A file or directory can have multiple dynamic parts, like `[id]-[category].svelte`. (Parameters are 'non-greedy'; in an ambiguous case like `x-y-z`, `id` would be `x` and `category` would be `y-z`.)

### Endpoints

Endpoints are modules written in `.js` (or `.ts`) files that export functions corresponding to HTTP methods. Their job is to allow pages to read and write data that is only available on the server (for example in a database, or on the filesystem).

```ts
// Type declarations for endpoints (declarations marked with
// an `export` keyword can be imported from `@sveltejs/kit`)

export interface RequestHandler<Output = Record<string, any>> {
	(event: RequestEvent): MaybePromise<
		Either<Output extends Response ? Response : EndpointOutput<Output>, Fallthrough>
	>;
}

export interface RequestEvent {
	request: Request;
	url: URL;
	params: Record<string, string>;
	locals: App.Locals;
	platform: App.Platform;
}

export interface EndpointOutput<Output = Record<string, any>> {
	status?: number;
	headers?: Headers | Partial<ResponseHeaders>;
	body?: Record<string, any>;
}

type MaybePromise<T> = T | Promise<T>;

interface Fallthrough {
	fallthrough: true;
}
```

> See the [TypeScript](#typescript) section for information on `App.Locals` and `App.Platform`.

A page like `src/routes/items/[id].svelte` could get its data from `src/routes/items/[id].js`:

```js
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
}
```

> All server-side code, including endpoints, has access to `fetch` in case you need to request data from external APIs. Don't worry about the `$lib` import, we'll get to that [later](#modules-$lib).

The job of this function is to return a `{ status, headers, body }` object representing the response, where `status` is an [HTTP status code](https://httpstatusdogs.com):

- `2xx` — successful response (default is `200`)
- `3xx` — redirection (should be accompanied by a `location` header)
- `4xx` — client error
- `5xx` — server error

> If `{fallthrough: true}` is returned SvelteKit will [fall through](#routing-advanced-fallthrough-routes) to other routes until something responds, or will respond with a generic 404.

The returned `body` corresponds to the page's props:

```svelte
<script>
	// populated with data from the endpoint
	export let item;
</script>

<h1>{item.title}</h1>
```

#### POST, PUT, PATCH, DELETE

Endpoints can handle any HTTP method — not just `GET` — by exporting the corresponding function:

```js
export function post(event) {...}
export function put(event) {...}
export function patch(event) {...}
export function del(event) {...} // `delete` is a reserved word
```

These functions can, like `get`, return a `body` that will be passed to the page as props. Whereas 4xx/5xx responses from `get` will result in an error page rendering, similar responses to non-GET requests do not, allowing you to do things like render form validation errors:

```js
// src/routes/items.js
import * as db from '$lib/database';

export async function get() {
	const items = await db.list();

	return {
		body: { items }
	};
}

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
<!-- src/routes/items.svelte -->
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

If you request the route with an `accept: application/json` header, SvelteKit will render the endpoint data as JSON, rather than the page as HTML.

#### Body parsing

The `request` object is an instance of the standard [Request](https://developer.mozilla.org/en-US/docs/Web/API/Request) class. As such, accessing the request body is easy:

```js
export async function post({ request }) {
	const data = await request.formData(); // or .json(), or .text(), etc
}
```

#### Setting cookies

Endpoints can set cookies by returning a `headers` object with `set-cookie`. To set multiple cookies simultaneously, return an array:

```js
return {
	headers: {
		'set-cookie': [cookie1, cookie2]
	}
};
```

#### HTTP method overrides

HTML `<form>` elements only support `GET` and `POST` methods natively. You can allow other methods, like `PUT` and `DELETE`, by specifying them in your [configuration](#configuration-methodoverride) and adding a `_method=VERB` parameter (you can configure the name) to the form's `action`:

```js
// svelte.config.js
export default {
	kit: {
		methodOverride: {
			allowed: ['PUT', 'PATCH', 'DELETE']
		}
	}
};
```

```html
<form method="post" action="/todos/{id}?_method=PUT">
	<!-- form elements -->
</form>
```

> Using native `<form>` behaviour ensures your app continues to work when JavaScript fails or is disabled.

### Standalone endpoints

Most commonly, endpoints exist to provide data to the page with which they're paired. They can, however, exist separately from pages. Standalone endpoints have slightly more flexibility over the returned `body` type — in addition to objects, they can return a string or a `Uint8Array`.

> Support for streaming request and response bodies is [coming soon](https://github.com/sveltejs/kit/issues/3419).

### Private modules

Files and directories with a leading `_` or `.` (other than [`.well-known`](https://en.wikipedia.org/wiki/Well-known_URI)) are private by default, meaning that they do not create routes (but can be imported by files that do). You can configure which modules are considered public or private with the [`routes`](#configuration-routes) configuration.

### Advanced routing

#### Rest parameters

A route can have multiple dynamic parameters, for example `src/routes/[category]/[item].svelte` or even `src/routes/[category]-[item].svelte`. (Parameters are 'non-greedy'; in an ambiguous case like `/x-y-z`, `category` would be `x` and `item` would be `y-z`.) If the number of route segments is unknown, you can use rest syntax — for example you might implement GitHub's file viewer like so...

```bash
/[org]/[repo]/tree/[branch]/[...file]
```

...in which case a request for `/sveltejs/kit/tree/master/documentation/docs/01-routing.md` would result in the following parameters being available to the page:

```js
{
	org: 'sveltejs',
	repo: 'kit',
	branch: 'master',
	file: 'documentation/docs/01-routing.md'
}
```

> `src/routes/a/[...rest]/z.svelte` will match `/a/z` as well as `/a/b/z` and `/a/b/c/z` and so on. Make sure you check that the value of the rest parameter is valid.

#### Fallthrough routes

Finally, if you have multiple routes that match a given path, SvelteKit will try each of them until one responds. For example if you have these routes...

```bash
src/routes/[baz].js
src/routes/[baz].svelte
src/routes/[qux].svelte
src/routes/foo-[bar].svelte
```

... and you navigate to `/foo-xyz`, then SvelteKit will first try `foo-[bar].svelte` because it is the best match. If that yields no response, SvelteKit will try other less specific yet still valid matches for `/foo-xyz`. Since endpoints have higher precedence than pages, the next attempt will be `[baz].js`. Then alphabetical order takes precedence and thus `[baz].svelte` will be tried before `[qux].svelte`. The first route that responds — a page that returns something from [`load`](#loading) or has no `load` function, or an endpoint that returns something — will handle the request.

If no page or endpoint responds to a request, SvelteKit will respond with a generic 404.
