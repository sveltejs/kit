---
title: Adapters
---

## Static Adapter

Many sites are effectively _static_, which is to say they don't actually need an Express server backing them. Instead, they can be hosted and served as static files, which allows them to be deployed to more hosting environments (such as [Netlify](https://www.netlify.com/) or [GitHub Pages](https://pages.github.com/)). Static sites are generally cheaper to operate and have better performance characteristics.

SvelteKit allows you to _export_ a static site with the static adapter. In fact, you're looking at an exported site right now!

Static doesn't mean non-interactive — your Svelte components work exactly as they do normally, and you still get all the benefits of client-side routing and prefetching.

### Specifying the static adapter

Specify `@sveltejs/adapter-static` in your `svelte.config.cjs`:

```js
module.exports = {
	kit: {
		adapter: '@sveltejs/adapter-static'
	}
};
```

### How it works

When you run `svelte-kit build`, SvelteKit first builds a production version of your app, as though you had used the Node adapter, and copies the contents of your `static` folder to the destination.

When you run `svelte-kit adapt` with the static adapter, it then starts the server, and navigates to the root of your app. From there, it follows any `<a>`, `<img>`, `<link>` and `<source>` elements it finds pointing to local URLs, and captures any data served by the app.

Because of this, any pages you want to be included in the exported site must be reachable by `<a>` elements.

### When not to use the static adapter

The basic rule is this: for an app to be exportable, any two users hitting the same page of your app must get the same content from the server. In other words, any app that involves user sessions or authentication is _not_ a candidate for the static adapter.

Note that you can still export apps with dynamic routes, like our `src/routes/blog/[slug].svelte` example from earlier. The static adapter will intercept requests made inside `load`, so the data served from `src/routes/blog/[slug].json.js` will also be captured.

### Route conflicts

Because the static adapter writes to the filesystem, it isn't possible to have two server routes that would cause a directory and a file to have the same name. For example, `src/routes/foo/index.js` and `src/routes/foo/bar.js` would try to create `foo` and `foo/bar`, which is impossible.

The solution is to rename one of the routes to avoid conflict — for example, `src/routes/foo-bar.js`. (Note that you would also need to update any code that fetches data from `/foo/bar` to reference `/foo-bar` instead.)

For _pages_, we skirt around this problem by writing `foo/index.html` instead of `foo`.

## Vercel adapter

We can deploy to Vercel by specifying the Vercel adapter in `svelte.config.cjs`:

```bash
$ cat
module.exports = {
	kit: {
		adapter: '@sveltejs/adapter-vercel',
	}
};

```

## Netlify adapter

We can deploy to Netlify by specifying the Netlify adapter in `svelte.config.cjs`:

```bash
$ cat
module.exports = {
	kit: {
		adapter: '@sveltejs/adapter-netlify',
	}
};

```
