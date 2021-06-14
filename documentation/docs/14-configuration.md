---
title: Configuration
---

Your project's configuration lives in a `svelte.config.js` file. All values are optional. The complete list of options, with defaults, is shown here:

```js
/** @type {import('@sveltejs/kit').Config} */
const config = {
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
			hooks: 'src/hooks',
			lib: 'src/lib',
			routes: 'src/routes',
			serviceWorker: 'src/service-worker',
			template: 'src/app.html'
		},
		floc: false,
		host: null,
		hostHeader: null,
		hydrate: true,
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
		router: true,
		ssr: true,
		target: null,
		trailingSlash: 'never',
		package: {
			dir: 'package',
			exports: {
				include: ['**'],
				exclude: ['_*', '**/_*']
			},
			files: {
				include: ['**'],
				exclude: []
			},
			types: {
				folder: '.',
				entry: undefined
			}
		},
		vite: () => ({})
	},

	// options passed to svelte.preprocess (https://svelte.dev/docs#svelte_preprocess)
	preprocess: null
};

export default config;
```

### adapter

Determines how the output of `svelte-kit build` is converted for different platforms. See [Adapters](#adapters).

### amp

Enable [AMP](#amp) mode.

### appDir

The directory relative to `paths.assets` where the built JS and CSS (and imported assets) are served from. (The filenames therein contain content-based hashes, meaning they can be cached indefinitely).

### files

An object containing zero or more of the following `string` values:

- `assets` — a place to put static files that should have stable URLs and undergo no processing, such as `favicon.ico` or `manifest.json`
- `lib` — your app's internal library, accessible throughout the codebase as `$lib`
- `routes` — the files that define the structure of your app (see [Routing](#routing))
- `serviceWorker` — the location of your service worker's entry point (see [Service workers](#service-workers))
- `hooks` — the location of your hooks module (see [Hooks](#hooks))
- `template` — the location of the template for HTML responses

### floc

Google's [FLoC](https://github.com/WICG/floc) is a technology for targeted advertising that the [Electronic Frontier Foundation](https://www.eff.org/) has deemed [harmful](https://www.eff.org/deeplinks/2021/03/googles-floc-terrible-idea) to user privacy. [Browsers other than Chrome](https://www.theverge.com/2021/4/16/22387492/google-floc-ad-tech-privacy-browsers-brave-vivaldi-edge-mozilla-chrome-safari) have declined to implement it.

In common with services like [GitHub Pages](https://github.blog/changelog/2021-04-27-github-pages-permissions-policy-interest-cohort-header-added-to-all-pages-sites/), SvelteKit protects your users by automatically opting out of FLoC. It adds the following header to responses unless `floc` is `true`:

```
Permissions-Policy: interest-cohort=()
```

> This only applies to server-rendered responses — headers for prerendered pages (e.g. created with [adapter-static](https://github.com/sveltejs/kit/tree/master/packages/adapter-static)) are determined by the hosting platform.

### host

A value that overrides the `Host` header when populating `page.host`

### hostHeader

If your app is behind a reverse proxy (think load balancers and CDNs) then the `Host` header will be incorrect. In most cases, the underlying host is exposed via the [`X-Forwarded-Host`](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/X-Forwarded-Host) header and you should specify this in your config if you need to access `page.host`:

```js
// svelte.config.js
export default {
	kit: {
		hostHeader: 'X-Forwarded-Host'
	}
};
```

**You should only do this if you trust the reverse proxy**, which is why it isn't the default.

### hydrate

Whether to [hydrate](#ssr-and-javascript-hydrate) the server-rendered HTML with a client-side app. (It's rare that you would set this to `false` on an app-wide basis.)

### paths

An object containing zero or more of the following `string` values:

- `assets` — an absolute path, or a path relative to `base`, where your app's files are served from. This is useful if your files are served from a storage bucket of some kind
- `base` — a root-relative (i.e. starts with `/`) path that specifies where your app is served from. This allows the app to live on a non-root path

### prerender

See [Prerendering](#ssr-and-javascript-prerender). An object containing zero or more of the following:

- `crawl` — determines whether SvelteKit should find pages to prerender by following links from the seed page(s)
- `enabled` — set to `false` to disable prerendering altogether
- `force` — if `true`, a page that fails to render will _not_ cause the entire build to fail
- `pages` — an array of pages to prerender, or start crawling from (if `crawl: true`). The `*` string includes all non-dynamic routes (i.e. pages with no `[parameters]` )

### router

Enables or disables the client-side [router](#ssr-and-javascript-router) app-wide.

### ssr

Enables or disables [server-side rendering](#ssr-and-javascript-ssr) app-wide.

### target

Specifies an element to mount the app to. It must be a DOM selector that identifies an element that exists in your template file. If unspecified, the app will be mounted to `document.body`.

### trailingSlash

Whether to remove, append, or ignore trailing slashes when resolving URLs to routes.

- `"never"` — redirect `/x/` to `/x`
- `"always"` — redirect `/x` to `/x/`
- `"ignore"` — don't automatically add or remove trailing slashes. `/x` and `/x/` will be treated equivalently

> Ignoring trailing slashes is not recommended — the semantics of relative paths differ between the two cases (`./y` from `/x` is `/y`, but from `/x/` is `/x/y`), and `/x` and `/x/` are treated as separate URLs which is harmful to SEO. If you use this option, ensure that you implement logic for conditionally adding or removing trailing slashes from `request.path` inside your [`handle`](#hooks-handle) function.

### package

Options related to [creating a package](#packaging).

Generating type definitions:

- `types/folder` - the folder where to place the type definitions. By default they are placed next to their implementation. A common alternative is to place them in a `types` folder.
- `types/entry` - when importing from the root of the package (`import { foo } from 'your-package'`), TypeScript needs to know where to look for the entry point's type definitions. By default this option is `undefined`, which means TypeScript is looking for a `index.d.ts` file. If you set the `folder` option, you likely also want to set this option. So for example if you set `folder` to types and you have a `index.js` which is your entry point, `entry` would be `./types/index.d.ts`

### vite

A [Vite config object](https://vitejs.dev/config), or a function that returns one. Not all configuration options can be set, since SvelteKit depends on certain values being configured internally.
