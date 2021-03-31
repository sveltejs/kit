---
title: Routing
---

At the heart of SvelteKit is a _filesystem-based router_. This means that the structure of your application is defined by the structure of your codebase — specifically, the contents of `src/routes`.

> You can change this to a different directory by editing the [project config](#configuration).

There are two types of route — **pages** and **endpoints**.

### Pages

Pages are Svelte components written in `.svelte` files (or any file with an extension listed in [`config.extensions`](#configuration)). When a user first visits the application, they will be served a server-rendered version of the page in question, plus some JavaScript that 'hydrates' the page and initialises a client-side router. From that point forward, navigating to other pages is handled entirely on the client for a fast, app-like feel.

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

Dynamic parameters are encoded using `[brackets]`. For example, a blog post might be defined by `src/routes/blog/[slug].svelte`. Soon, we'll see how to access that parameter in a [load function](#loading) or the [page store](#modules-app-stores).

### Endpoints

Endpoints are modules written in `.js` (or `.ts`) files that export functions corresponding to HTTP methods. For example our hypothetical blog page, `/blog/cool-article`, might request data from `/blog/cool-article.json`, which could be represented by a `src/routes/blog/[slug].json.js` endpoint:

```ts
type Request<Context = any> = {
	host: string;
	method: 'GET';
	headers: Record<string, string>;
	path: string;
	params: Record<string, string | string[]>;
	query: URLSearchParams;
	body: string | Buffer | ReadOnlyFormData;
	context: Context; // see getContext, below
};

type Response = {
	status?: number;
	headers?: Record<string, string>;
	body?: any;
};

type RequestHandler<Context = any> = {
	(request: Request<Context>) => Response | Promise<Response>;
}
```

```js
import db from '$lib/database';

/**
 * @type {import('@sveltejs/kit').RequestHandler}
 */
export async function get({ params }) {
	// the `slug` parameter is available because this file
	// is called [slug].json.js
	const { slug } = params;

	const article = await db.get(slug);

	if (article) {
		return {
			body: {
				article
			}
		};
	}
}
```

> Returning nothing is equivalent to an explicit 404 response.

Because this module only runs on the server (or when you build your site, if [prerendering](#prerendering)), you can freely access things like databases. (Don't worry about `$lib`, we'll get to that [later](#$lib).)

The job of this function is to return a `{status, headers, body}` object representing the response. If the returned `body` is an object, and no `content-type` header is returned, it will automatically be turned into a JSON response.

For endpoints that handle other HTTP methods, like POST, export the corresponding function:

```js
export function post(request) {...}
```

Since `delete` is a reserved word in JavaScript, DELETE requests are handled with a `del` function.

> We don't interact with the `req`/`res` objects you might be familiar with from Node's `http` module or frameworks like Express, because they're only available on certain platforms. Instead, SvelteKit translates the returned object into whatever's required by the platform you're deploying your app to.
>
> The `body` property of the request object exists in the case of POST requests. If you're posting form data, it will be a read-only version of the [`FormData`](https://developer.mozilla.org/en-US/docs/Web/API/FormData) object.

To set multiple cookies in a single set of response headers, you can return an array:

```js
return {
	headers: {
		'set-cookie': [cookie1, cookie2]
	}
};
```

### Private modules

A filename that has a segment with a leading underscore, such as `src/routes/foo/_Private.svelte` or `src/routes/bar/_utils/cool-util.js`, is hidden from the router, but can be imported by files that are not.

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

#### Fallthrough routes

Finally, if you have multiple routes that match a given path, SvelteKit will try each of them until one responds. For example if you have these routes...

```bash
src/routes/[baz].js
src/routes/[baz].svelte
src/routes/[qux].svelte
src/routes/foo-[bar].svelte
```

...and you navigate to `/foo-xyz`, then SvelteKit will first try `foo-[bar].svelte` because it is the best match, then will try `[baz].js` (which is also a valid match for `/foo-xyz`, but less specific), then `[baz].svelte` and `[qux].svelte` in alphabetical order (endpoints have higher precedence than pages). The first route that responds — a page that returns something from [`load`](#loading) or has no `load` function, or an endpoint that returns something — will handle the request.

If no page or endpoint responds to a request, SvelteKit will respond with a generic 404.
