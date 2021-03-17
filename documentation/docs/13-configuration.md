---
title: Configuration
---

Your project's configuration lives in a `svelte.config.cjs` file. All values are optional. The complete list of options, with defaults, is shown here:

```js
/** @type {import('@sveltejs/kit').Config} */
module.exports = {
	// options passed to svelte.compile (https://svelte.dev/docs#svelte_compile)
	compilerOptions: null,

	// an array of file extensions that should be treated as Svelte components
	extensions: ['.svelte'],

	kit: {
		adapter: null,
		amp: false,
		appDir: '_app',
		files: {
			assets: 'static',
			lib: 'src/lib',
			routes: 'src/routes',
			serviceWorker: 'src/service-worker',
			setup: 'src/setup',
			template: 'src/app.html'
		},
		host: null,
		hostHeader: null,
		paths: {
			assets: '',
			base: ''
		},
		prerender: {
			crawl: true,
			enabled: true,
			force: false,
			pages: ['*']
		},
		target: null
	},

	// options passed to svelte.preprocess (https://svelte.dev/docs#svelte_preprocess)
	preprocess: null
};
```

#### adapter

Determines how the output of `svelte-kit build` is converted for different platforms. Can be specified as a `string` or a `[string, object]` tuple if you need to pass options.

#### amp

Enable [AMP](#amp) mode.

#### appDir

The directory relative to `paths.assets` where the built JS and CSS (and imported assets) are served from. (The filenames therein contain content-based hashes, meaning they can be cached indefinitely).

#### files

An object containing zero or more of the following `string` values:

* `assets` — a place to put static files that should have stable URLs and undergo no processing, such as `favicon.ico` or `manifest.json`
* `lib` — your app's internal library, accessible throughout the codebase as `$lib`
* `routes` — the files that define the structure of your app (see [Routing](#routing))
* `serviceWorker` — the location of your service worker's entry point (see [Service workers](#service-workers))
* `setup` — the location of your setup file (see [Setup](#setup))
* `template` — the location of the template for HTML responses

#### host

A value that overrides the `Host` header when populating `page.host`

#### hostHeader

If your app is behind a reverse proxy (think load balancers and CDNs) then the `Host` header will be incorrect. In most cases, the underlying host is exposed via the [`X-Forwarded-Host`](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/X-Forwarded-Host) header and you should specify this in your config if you need to access `page.host`:

```js
// svelte.config.cjs
module.exports = {
	kit: {
		hostHeader: 'X-Forwarded-Host'
	}
};
```

**You should only do this if you trust the reverse proxy**, which is why it isn't the default.

#### paths

An object containing zero or more of the following `string` values:

* `assets` — an absolute path, or a path relative to `base`, where your app's files are served from. This is useful if your files are served from a storage bucket of some kind
* `base` — a root-relative (i.e. starts with `/`) path that specifies where your app is served from. This allows the app to live on a non-root path

#### prerender

See [Prerendering](#prerendering). An object containing zero or more of the following:

* `crawl` — determines whether SvelteKit should find pages to prerender by following links from the seed page(s)
* `enabled` — set to `false` to disable prerendering altogether
* `force` — if `true`, a page that fails to render will _not_ cause the entire build to fail
* `pages` — an array of pages to prerender, or start crawling from (if `crawl: true`). The `*` string includes all non-dynamic routes (i.e. pages with no `[parameters]` )

#### target

Specifies an element to mount the app to. It must be a DOM selector that identifies an element that exists in your template file. If unspecified, the app will be mounted to `document.body`.