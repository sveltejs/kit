---
title: Routing
---

At the heart of SvelteKit is a _filesystem-based router_. This means that the structure of your application is defined by the structure of your codebase — specifically, the contents of `src/routes`.

> You can change this to a different directory by editing the [project config](/docs/configuration).

Inside the routes folder, files with a `+` prefix have special meaning to SvelteKit.

> The `+` prefix was chosen for several reasons:
>
> - It's distinctive and easy to spot — as a newcomer it immediately cues into that _something_ is going on, after that, you immediately _know_ what's going on.
> - It nicely groups all special files. You are encouraged to colocate other files related only to that part of your app in the same folder without having to think about any prefixes for them.
> - It's easy to search for, both in the docs and your editor's file search.

The first type of files are those related to routes, or pages. A route is defined by a directory in your routes folder with a `+page.svelte` file. By default, pages are rendered on both the client and server, though this behaviour is configurable. A corresponding `+page.server.js` file is able to provide data to the page and receive data from it in the case of form POSTs. It only runs on the server. Additionally, a `+page.js` file is able to provide data to the page - if a `+page.server.js` is present, `+page.js` runs afterwards, receives the data from `+page.server.js` and can transform it - and can contain meta information relevant to the router.

Related to pages are [layouts](/docs/layouts), named `+layout.svelte`. They contain common UI (like a header) or logic (like authentication) and wrap every page below it. Similar to pages a `+layout.server.js` and/or `+layout.js` file can be added. They function the same as their corresponding page files, except they can't receive data from layouts - they are read-only.

In case of unexpected exceptions, you can fall back to a more gracious page using [`+error.svelte`](/docs/layouts#error-pages). If something goes wrong, the next `+error.svelte` file up the tree is used to display your fallback UI.

Lastly, if you want to create endpoints, you create a `+server.js` file.

Each of these special files is discussed in more detail in their respective sections.

### Pages

Pages are Svelte components written in `+page.svelte` files (or any `+page` file with an extension listed in [`config.extensions`](/docs/configuration)). By default, when a user first visits the application, they will be served a server-rendered version of the page in question, plus some JavaScript that 'hydrates' the page and initialises a client-side router. From that point forward, navigating to other pages is handled entirely on the client for a fast, app-like feel where the common portions in the layout do not need to be rerendered.

The foldername determines the route. For example, `src/routes/+page.svelte` is the root of your site:

```html
/// file: src/routes/+page.svelte
<svelte:head>
	<title>Welcome</title>
</svelte:head>

<h1>Hello and welcome to my site!</h1>

<a href="/about">About my site</a>
```

A file called `src/routes/about/+page.svelte` would correspond to the `/about` route:

```html
/// file: src/routes/about/+page.svelte
<svelte:head>
	<title>About</title>
</svelte:head>

<h1>About this site</h1>
<p>TODO...</p>

<a href="/">Home</a>
```

> Note that SvelteKit uses `<a>` elements to navigate between routes, rather than a framework-specific `<Link>` component.

Dynamic parameters are encoded using `[brackets]`. For example, a blog post might be defined by `src/routes/blog/[slug]/+page.svelte`. These parameters can be accessed in a [`load`](/docs/loading#input-params) function or via the [`page`](/docs/modules#$app-stores) store.

A route can have multiple dynamic parameters, for example `src/routes/[category]/[item]/+page.svelte` or even `src/routes/[category]-[item]/+page.svelte`. (Parameters are 'non-greedy'; in an ambiguous case like `x-y-z`, `category` would be `x` and `item` would be `y-z`.)

### Page Endpoints

Page endpoints are modules written in `+page.server.js` (or `+page.server.ts`) files that export [request handler](/docs/types#sveltejs-kit-requesthandler) functions corresponding to HTTP methods. Request handlers make it possible to read and write data that is only available on the server (for example in a database, or on the filesystem). `+page.server.js` files can only exist next to a `+page.svelte` file; the page gets its data from the endpoint — via `fetch` during client-side navigation, or via direct function call during SSR.

For example, you might have a `src/routes/items/[id]/+page.svelte` page...

```svelte
/// file: src/routes/items/[id]/+page.svelte
<script>
	// populated with data from the endpoint and correctly typed
	/** @type{import('$./types').Data} */
	export let data;
</script>

<h1>{data.item.title}</h1>
```

...paired with a `src/routes/items/[id]/+page.js` endpoint (don't worry about the `$lib` import, we'll get to that [later](/docs/modules#$lib)):

```js
/// file: src/routes/items/[id]/+page.server.js
// @filename: ambient.d.ts
type Item = {};

declare module '$lib/database' {
	export const get: (id: string) => Promise<Item>;
}

// @filename: $types.d.ts
import type { RequestHandler as GenericRequestHandler } from '@sveltejs/kit';
export type RequestHandler<Body = any> = GenericRequestHandler<{ id: string }, Body>;

// @filename: index.js
// ---cut---
import db from '$lib/database';

/** @type {import('./$types').RequestHandler} */
export async function GET({ params }) {
	// `params.id` comes from [id] in the folder
	const item = await db.get(params.id);
	return item;
}
```

> The type of the `GET` function above comes from `./$types.d.ts`, which is a file generated by SvelteKit (inside your [`outDir`](/docs/configuration#outdir), using the [`rootDirs`](https://www.typescriptlang.org/tsconfig#rootDirs) option) that provides type safety when accessing `params` in the `+page.server.js` and `data` in `+page.svelte`. See the section on [generated types](/docs/types#generated-types) for more detail.

To get the raw data instead of the page, you can include an `accept: application/json` header in the request, or — for convenience — append `/__data.json` to the URL, e.g. `/items/[id]/__data.json`.

The different types of request handlers and their capabilities are explained in more detail in the following sections.

#### GET

`GET` handlers return an object representing the response, which must be a plain object that is JSON-serializable. You can optionally set headers using the `setHeaders` method:

```js
/// file: src/routes/random/+page.server.js
/** @type {import('@sveltejs/kit').RequestHandler} */
export async function GET({ setHeaders }) {
	setHeaders({
		'access-control-allow-origin': '*'
	});

	return {
		number: Math.random()
	};
}
```

If something unexpected happens, you `throw` using the `error` helper:

```js
/// file: src/routes/dan/+page.server.js
import { error } from '@sveltejs/kit/data';

/** @type {import('./$types').GET} */
export function GET({ session }) {
	if (session.user?.name !== 'Dan') {
		throw error(403, `If your name's not Dan, you're not coming in`);
	}

	return {
		answer: 42
	};
}
```

The first argument to `error` is an [HTTP status code](https://httpstatusdogs.com) (you'll most likely reach for `4xx` — client error, or `5xx` — server error), the second is an explanatory message. You can access both using the [page store](/docs/modules#$app-stores-page).

#### POST

In the case of `POST`, there are basically three possible outcomes — success, failure due to input validation errors, and failure due to something unexpected that requires showing an error page.

In the success case, nothing or a redirect is returned. The latter is often used to redirect to the newly created resource. We can achieve this by returning a `location` property that indicates where the created resource lives:

```js
/// file: src/routes/todos/+page.server.js

/** @type {import('./$types').POST} */
export function POST({ request }) {
  const data = await request.formData();
  await create_todo(data);
  const id = await create_todo(data);

  return {
    location: `/todos/${id}`
  };
}
```

After the `POST` handler returns, the `GET` handler (on the current site or the one that is redirected to) is invoked again, being able to provide the new data.

Unexpected failures are easy to deal with, as it's the same as `GET` — `throw error(status)`.

Validation errors cause the page to be re-rendered with the errors, so they can be used for UI that guides the user towards valid inputs:

```js
/// file: src/routes/todos/+page.server.js
/** @type {import('./$types').POST} */
export function POST({ request }) {
  const data = await request.formData();

  if (!data.get('description').includes('potato')) {
    return {
      errors: {
        description: 'Must include the word "potato"'
      }
    };
  }

  await create_todo(data);
}
```

```html
/// file: src/routes/todos/+page.svelte
<script>
	/** @type {import('./$types').Data} */
	export let data;

	/** @type {import('./$types').Errors} */
	export let errors;
</script>

<form method="post">
	{#if errors?.description}
	<p class="error">{errors.description}</p>
	{/if}
	<input name="description" />
	<button type="submit">Create new TODO</button>
</form>
```

#### PUT and PATCH

These methods are basically the same as `POST`, except that since no new resource is being created, there's no need to return a location property.

#### DELETE

`DELETE` is simpler still; no data is being submitted, so there's no room for errors. If the function succeeds, SvelteKit responds with a 204.

#### Body parsing

The `request` object is an instance of the standard [Request](https://developer.mozilla.org/en-US/docs/Web/API/Request) class. As such, accessing the request body is easy:

```js
// @filename: ambient.d.ts
declare global {
	const create: (data: any) => any;
}

export {};

// @filename: +page.server.js
// ---cut---
/** @type {import('@sveltejs/kit').RequestHandler} */
export async function POST({ request }) {
	const data = await request.formData(); // or .json(), or .text(), etc
	await create(data);
}
```

#### Setting cookies

Endpoints can set cookies by invoking the `setHeaders` helper method with `set-cookie`. To set multiple cookies simultaneously, return an array:

```js
// @filename: ambient.d.ts
const cookie1: string;
const cookie2: string;

// @filename: index.js
// ---cut---
/** @type {import('@sveltejs/kit').RequestHandler} */
export function GET({ setHeaders }) {
	setHeaders({
		'set-cookie': [cookie1, cookie2]
	});
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

### Standalone endpoints

Most commonly, endpoints exist to provide data to the page with which they're paired. They can, however, exist separately from pages. Standalone endpoints have more flexibility — they return [`Response`](https://developer.mozilla.org/en-US/docs/Web/API/Response) objects. This means you have more possibilities for your response `body` type besides JSON, for example [`Uint8Array`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Uint8Array) or a [`ReadableStream`](https://developer.mozilla.org/en-US/docs/Web/API/ReadableStream).

Standalone endpoints reside in a `+server.js` (or `.ts`) file, the folder describes the URL where the endpoint is available - just like for pages:

| filename                              | endpoint   |
| ------------------------------------- | ---------- |
| src/routes/data/index.json/+server.js | /data.json |
| src/routes/data/+server.js            | /data      |

Because the foldername describes the endpoint URL, you can't have a `+server.js` file next to a `+page.svelte` file — when hitting the URL, SvelteKit wouldn't know if you want to render the page or return data from the endpoint.

#### GET, POST, PUT, PATCH, DELETE

Endpoints can handle any HTTP method — not just `GET` — by exporting the corresponding function:

```js
// @noErrors
export function GET(event) {...}
export function POST(event) {...}
export function PUT(event) {...}
export function PATCH(event) {...}
export function DELETE(event) {...}
```

All methods need to return [`Response`](https://developer.mozilla.org/en-US/docs/Web/API/Response) objects. For convenience you can also use the `setHeaders` method and the `error` and `redirect` imports, though strictly speaking they're not necessary since you could construct your own error/redirect `Response` objects with whatever headers you like.

```js
/// file: src/routes/items.json/+server.js
// @filename: ambient.d.ts
type Item = {
	id: string;
};
type ValidationError = {};

declare module '$lib/database' {
	export const list: () => Promise<Item[]>;
	export const create: (request: Request) => Promise<[Record<string, ValidationError>, Item]>;
}

// @filename: $types.d.ts
import type { RequestHandler as GenericRequestHandler } from '@sveltejs/kit';
export type RequestHandler<Body = any> = GenericRequestHandler<{}, Body>;

// @filename: +server.js
// ---cut---
import * as db from '$lib/database';

/** @type {import('./$types').RequestHandler} */
export async function GET() {
	const items = await db.list();

	return new Response(
		JSON.stringify(items),
		{ headers: { 'content-type': 'application/json; charset=utf-8' }}
	);
}
```

### Private modules

Files and directories with a leading `_` or `.` (other than [`.well-known`](https://en.wikipedia.org/wiki/Well-known_URI)) are private by default, meaning that they do not create routes (but can be imported by files that do). You can configure which modules are considered public or private with the [`routes`](/docs/configuration#routes) configuration.

### Advanced routing

#### Rest parameters

If the number of route segments is unknown, you can use rest syntax — for example you might implement GitHub's file viewer like so...

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

> `src/routes/a/[...rest]/z.svelte` will match `/a/z` (i.e. there's no parameter at all) as well as `/a/b/z` and `/a/b/c/z` and so on. Make sure you check that the value of the rest parameter is valid, for example using a [matcher](#advanced-routing-matching).

#### Matching

A route like `src/routes/archive/[page]` would match `/archive/3`, but it would also match `/archive/potato`. We don't want that. You can ensure that route parameters are well-formed by adding a _matcher_ — which takes the parameter string (`"3"` or `"potato"`) and returns `true` if it is valid — to your [`params`](/docs/configuration#files) directory...

```js
/// file: src/params/integer.js
/** @type {import('@sveltejs/kit').ParamMatcher} */
export function match(param) {
	return /^\d+$/.test(param);
}
```

...and augmenting your routes:

```diff
-src/routes/archive/[page]
+src/routes/archive/[page=integer]
```

If the pathname doesn't match, SvelteKit will try to match other routes (using the sort order specified below), before eventually returning a 404.

> Matchers run both on the server and in the browser.

#### Sorting

It's possible for multiple routes to match a given path. For example each of these routes would match `/foo-abc`:

```bash
src/routes/[...catchall].svelte
src/routes/[a].js
src/routes/[b].svelte
src/routes/foo-[c].svelte
src/routes/foo-abc.svelte
```

SvelteKit needs to know which route is being requested. To do so, it sorts them according to the following rules...

- More specific routes are higher priority (e.g. a route with no parameters is more specific than a route with one dynamic parameter, and so on)
- Standalone endpoints have higher priority than pages with the same specificity
- Parameters with [matchers](#advanced-routing-matching) (`[name=type]`) are higher priority than those without (`[name]`)
- Rest parameters have lowest priority
- Ties are resolved alphabetically

...resulting in this ordering, meaning that `/foo-abc` will invoke `src/routes/foo-abc.svelte`, and `/foo-def` will invoke `src/routes/foo-[c].svelte` rather than less specific routes:

```bash
src/routes/foo-abc.svelte
src/routes/foo-[c].svelte
src/routes/[a].js
src/routes/[b].svelte
src/routes/[...catchall].svelte
```

#### Encoding

Filenames are URI-decoded, meaning that (for example) a filename like `%40[username].svelte` would match characters beginning with `@`:

```js
// @filename: ambient.d.ts
declare global {
	const assert: {
		equal: (a: any, b: any) => boolean;
	};
}

export {};

// @filename: index.js
// ---cut---
assert.equal(
	decodeURIComponent('%40[username].svelte'),
	'@[username].svelte'
);
```

To express a `%` character, use `%25`, otherwise the result will be malformed.
