---
title: Preloading
---

Page components can define a `preload` function that runs before the component is created. The values it returns are passed as props to the page.

`preload` functions are called when a page is loaded and are typically used to load data that the page depends on - hence its name. This avoids the user seeing the page update as it loads, as is typically the case with client-side loading.

`preload` is the Sapper equivalent to `getInitialProps` in Next.js or `asyncData` in Nuxt.js.

Note that `preload` will run both on the server side and on the client side. It may therefore not reference any APIs only present in the browser.

The following code shows how to load a blog post and pass it to the page in the `article` prop:

```html
<script context="module">
	export async function preload(page, session) {
		const { slug } = page.params;

		const res = await this.fetch(`blog/${slug}.json`);
		const article = await res.json();

		return { article };
	}
</script>

<script>
	export let article;
</script>

<h1>{article.title}</h1>
```

The [routing section](docs#Routing) describes how the dynamic parameter `slug` works.

It should be defined in a `context="module"` script since it is not part of the component instance itself – it runs before the component has been created. See the [tutorial](https://svelte.dev/tutorial/module-exports) for more on the module context.

### Arguments

The `preload` function receives two arguments — `page` and `session`.

`page` is a `{ host, path, params, query }` object where `host` is the URL's host, `path` is its pathname, `params` is derived from `path` and the route filename, and `query` is an object of values in the query string.

So if the example above was `src/routes/blog/[slug].svelte` and the URL was `/blog/some-post?foo=bar&baz`, the following would be true:

* `page.path === '/blog/some-post'`
* `page.params.slug === 'some-post'`
* `page.query.foo === 'bar'`
* `page.query.baz === true`

`session` can be used to pass data from the server related to the current request, e.g. the current user. By default it is `undefined`. [Seeding session data](docs#Seeding_session_data) describes how to add data to it.


### Return value

If you return a Promise from `preload`, the page will delay rendering until the promise resolves. You can also return a plain object. In both cases, the values in the object will be passed into the components as props.

When Sapper renders a page on the server, it will attempt to serialize the resolved value (using [devalue](https://github.com/Rich-Harris/devalue)) and include it on the page, so that the client doesn't also need to call `preload` upon initialization. Serialization will fail if the value includes functions or custom classes (cyclical and repeated references are fine, as are built-ins like `Date`, `Map`, `Set` and `RegExp`).

### Context

Inside `preload`, you have access to three methods:

* `this.fetch(url, options)`
* `this.error(statusCode, error)`
* `this.redirect(statusCode, location)`


#### this.fetch

In browsers, you can use `fetch` to make AJAX requests, for getting data from your server routes (among other things). On the server it's a little trickier — you can make HTTP requests, but you must specify an origin, and you don't have access to cookies. This means that it's impossible to request data based on the user's session, such as data that requires you to be logged in.

To fix this, Sapper provides `this.fetch`, which works on the server as well as in the client:

```html
<script context="module">
	export async function preload() {
		const res = await this.fetch(`server-route.json`);

		// ...
	}
</script>
```

It is important to note that `preload` may run on either the server or in the client browser. Code called inside `preload` blocks:
  - should run on the same domain as any upstream API servers requiring credentials
  - should not reference `window`, `document` or any browser-specific objects
  - should not reference any API keys or secrets, which will be exposed to the client

If you are using Sapper as an authentication/authorization server, you can use session middleware such as [express-session](https://github.com/expressjs/session) in your `app/server.js` in order to maintain user sessions.


#### this.error

If the user navigated to `/blog/some-invalid-slug`, we would want to render a 404 Not Found page. We can do that with `this.error`:

```html
<script context="module">
	export async function preload({ params, query }) {
		const { slug } = params;

		const res = await this.fetch(`blog/${slug}.json`);

		if (res.status === 200) {
			const article = await res.json();
			return { article };
		}

		this.error(404, 'Not found');
	}
</script>
```

The same applies to other error codes you might encounter.


#### this.redirect

You can abort rendering and redirect to a different location with `this.redirect`:

```html
<script context="module">
	export async function preload(page, session) {
		const { user } = session;

		if (!user) {
			return this.redirect(302, 'login');
		}

		return { user };
	}
</script>
```

#### Typing the function

If you use TypeScript and want to access the above context methods, TypeScript will thow an error and tell you that it does not know the type of `this`. To fix it, you need to specify the type of `this` (see the [official TypeScript documentation](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-2-0.html#specifying-the-type-of-this-for-functions)). We provide you with helper interfaces so you can type the function like this:

```html
<script context="module">
	import type { Preload } from "@sapper/common";

	export const preload: Preload = async function(this, page, session) {
		const { user } = session;

		if (!user) {
			return this.redirect(302, 'login'); // TypeScript will know the type of `this` now
		}

		return { user };
	}
</script>
```
