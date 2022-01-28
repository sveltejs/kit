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

Dynamic parameters are encoded using `[brackets]`. For example, a blog post might be defined by `src/routes/blog/[slug].svelte`. Soon, we'll see how to access that parameter in a [load function](#loading) or the [page store](#modules-$app-stores).

A file or directory can have multiple dynamic parts, like `[id]-[category].svelte`. (Parameters are 'non-greedy'; in an ambiguous case like `x-y-z`, `id` would be `x` and `category` would be `y-z`.)

### Endpoints

Endpoints are modules written in `.js` (or `.ts`) files that export functions corresponding to HTTP methods.

```ts
// Declaration types for Endpoints
// * declarations that are not exported are for internal use

export interface RequestEvent<Locals = Record<string, any>, Platform = Record<string, any>> {
	request: Request;
	url: URL;
	params: Record<string, string>;
	locals: Locals;
	platform: Platform;
}

type Body = JSONString | Uint8Array | ReadableStream | stream.Readable;
export interface EndpointOutput<Output extends Body = Body> {
	status?: number;
	headers?: Headers | Partial<ResponseHeaders>;
	body?: Output;
}

type MaybePromise<T> = T | Promise<T>;
interface Fallthrough {
	fallthrough: true;
}

export interface RequestHandler<
	Locals = Record<string, any>,
	Platform = Record<string, any>,
	Output extends Body = Body
> {
	(event: RequestEvent<Locals, Platform>): MaybePromise<
		Either<Response | EndpointOutput<Output>, Fallthrough>
	>;
}
```

For example, our hypothetical blog page, `/blog/cool-article`, might request data from `/blog/cool-article.json`, which could be represented by a `src/routes/blog/[slug].json.js` endpoint:

```js
import db from '$lib/database';

/** @type {import('@sveltejs/kit').RequestHandler} */
export async function get({ params }) {
	// the `slug` parameter is available because this file
	// is called [slug].json.js
	const article = await db.get(params.slug);

	if (article) {
		return {
			body: {
				article
			}
		};
	}

	return {
		status: 404
	};
}
```

> All server-side code, including endpoints, has access to `fetch` in case you need to request data from external APIs.

The job of this function is to return a `{ status, headers, body }` object representing the response, where `status` is an [HTTP status code](https://httpstatusdogs.com):

- `2xx` — successful response (default is `200`)
- `3xx` — redirection (should be accompanied by a `location` header)
- `4xx` — client error
- `5xx` — server error

If the returned `body` is an object, and no `content-type` header is returned, it will automatically be turned into a JSON response. (Don't worry about `$lib`, we'll get to that [later](#modules-$lib).)

> If `{fallthrough: true}` is returned SvelteKit will [fall through](#routing-advanced-fallthrough-routes) to other routes until something responds, or will respond with a generic 404.

For endpoints that handle other HTTP methods, like POST, export the corresponding function:

```js
export function post(event) {...}
```

Since `delete` is a reserved word in JavaScript, DELETE requests are handled with a `del` function.

> We don't interact with the `req`/`res` objects you might be familiar with from Node's `http` module or frameworks like Express, because they're only available on certain platforms. Instead, SvelteKit translates the returned object into whatever's required by the platform you're deploying your app to.

To set multiple cookies in a single set of response headers, you can return an array:

```js
return {
	headers: {
		'set-cookie': [cookie1, cookie2]
	}
};
```

#### Body parsing

The `request` object is an instance of the standard [Request](https://developer.mozilla.org/en-US/docs/Web/API/Request) class. As such, accessing the request body is easy:

```js
export async function post({ request }) {
	const data = await request.formData(); // or .json(), or .text(), etc
}
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

### Private modules

Files and directories with a leading `_` or `.` (other than [`.well-known`](https://en.wikipedia.org/wiki/Well-known_URI)) are private by default, meaning that they do not create routes (but can be imported by files that do). You can configure which modules are considered public or private with the [`routes`](#configuration-routes) configuration.

### Advanced

#### Rest parameters

A route can have multiple dynamic parameters, for example `src/routes/[category]/[item].svelte` or even `src/routes/[category]-[item].svelte`. If the number of route segments is unknown, you can use rest syntax — for example you might implement GitHub's file viewer like so...

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
