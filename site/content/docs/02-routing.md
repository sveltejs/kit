---
title: Routing
---

As we've seen, there are two types of route in Sapper — pages, and server routes.


### Pages

Pages are Svelte components written in `.svelte` files. When a user first visits the application, they will be served a server-rendered version of the route in question, plus some JavaScript that 'hydrates' the page and initialises a client-side router. From that point forward, navigating to other pages is handled entirely on the client for a fast, app-like feel.

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

Dynamic parameters are encoded using `[brackets]`. For example, here's how you could create a page that renders a blog post:

```html
<!-- src/routes/blog/[slug].svelte -->
<script context="module">
	// the (optional) preload function takes a
	// `{ path, params, query }` object and turns it into
	// the data we need to render the page
	export async function preload(page, session) {
		// the `slug` parameter is available because this file
		// is called [slug].svelte
		const { slug } = page.params;

		// `this.fetch` is a wrapper around `fetch` that allows
		// you to make credentialled requests on both
		// server and client
		const res = await this.fetch(`blog/${slug}.json`);
		const article = await res.json();

		return { article };
	}
</script>

<script>
	export let article;
</script>

<svelte:head>
	<title>{article.title}</title>
</svelte:head>

<h1>{article.title}</h1>

<div class='content'>
	{@html article.html}
</div>
```

If you want to capture more params, you can create nested folders using the same naming convention: `[slug]/[language]`.

If you don't want to create several folders to capture more than one parameter like `[year]/[month]/...`, or if the number of parameters is dynamic, you can use a spread route parameter. For example, instead of individually capturing `/blog/[slug]/[year]/[month]/[day]`, you can create a file for `/blog/[...slug].svelte` and extract the params like so:

```html
<!-- src/routes/blog/[...slug].svelte -->
<script context="module">
	export async function preload({ params }) {
		let [slug, year, month, day] = params.slug;

		return { slug, year, month, day };
	}
</script>
```


> See the section on [preloading](docs#Preloading) for more info about `preload` and `this.fetch`


### Server routes

Server routes are modules written in `.js` files that export functions corresponding to HTTP methods. Each function receives HTTP `request` and `response` objects as arguments, plus a `next` function. This is useful for creating a JSON API. For example, here's how you could create an endpoint that served the blog page above:

```js
// routes/blog/[slug].json.js
import db from './_database.js'; // the underscore tells Sapper this isn't a route

export async function get(req, res, next) {
	// the `slug` parameter is available because this file
	// is called [slug].json.js
	const { slug } = req.params;

	const article = await db.get(slug);

	if (article !== null) {
		res.setHeader('Content-Type', 'application/json');
		res.end(JSON.stringify(article));
	} else {
		next();
	}
}
```

> `delete` is a reserved word in JavaScript. To handle DELETE requests, export a function called `del` instead.

If you are using TypeScript, use the following types:

```js
import { SapperRequest, SapperResponse } from '@sapper/server';

function get(req: SapperRequest, res: SapperResponse, next: () => void) { ... }
```

`SapperRequest` and `SapperResponse` will work with both Polka and Express. You can replace them with the types specific to your server, which are `polka.Request` / `http.ServerResponse` and `express.Request` / `express.Response`, respectively.

### File naming rules

There are three simple rules for naming the files that define your routes:

* A file called `src/routes/about.svelte` corresponds to the `/about` route. A file called `src/routes/blog/[slug].svelte` corresponds to the `/blog/:slug` route, in which case `params.slug` is available to `preload`
* The file `src/routes/index.svelte` corresponds to the root of your app. `src/routes/about/index.svelte` is treated the same as `src/routes/about.svelte`.
* Files and directories with a leading underscore do *not* create routes. This allows you to colocate helper modules and components with the routes that depend on them — for example you could have a file called `src/routes/_helpers/datetime.js` and it would *not* create a `/_helpers/datetime` route



### Error page

In addition to regular pages, there is a 'special' page that Sapper expects to find — `src/routes/_error.svelte`. This will be shown when an error occurs while rendering a page.

The `error` object is made available to the template along with the HTTP `status` code. `error` is also available in the [`page` store](docs#Stores).



### Regexes in routes

You can use a subset of regular expressions to qualify route parameters, by placing them in parentheses after the parameter name.

For example, `src/routes/items/[id([0-9]+)].svelte` would only match numeric IDs — `/items/123` would match and make the value `123` available in `page.params.id`, but `/items/xyz` would not match.

Because of technical limitations, the following characters cannot be used: `/`, `\`, `?`, `:`, `(` and `)`.
