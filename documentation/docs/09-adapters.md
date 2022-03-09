---
title: Adapters
---

Before you can deploy your SvelteKit app, you need to _adapt_ it for your deployment target. Adapters are small plugins that take the built app as input and generate output for deployment.

By default, projects are configured to use `@sveltejs/adapter-auto`, which detects your production environment and selects the appropriate adapter where possible. If your platform isn't (yet) supported, you may need to [install a custom adapter](/docs/adapters#community-adapters) or [write one](/docs/adapters#writing-custom-adapters).

> See the [adapter-auto README](https://github.com/sveltejs/kit/tree/master/packages/adapter-auto) for information on adding support for new environments.

### Supported environments

SvelteKit offers a number of officially-supported adapters.

You can deploy to the following platforms with the default adapter, `adapter-auto`:

- [Cloudflare Pages](https://developers.cloudflare.com/pages/) via [`adapter-cloudflare`](https://github.com/sveltejs/kit/tree/master/packages/adapter-cloudflare)
- [Netlify](https://netlify.com) via [`adapter-netlify`](https://github.com/sveltejs/kit/tree/master/packages/adapter-netlify)
- [Vercel](https://vercel.com) via [`adapter-vercel`](https://github.com/sveltejs/kit/tree/master/packages/adapter-vercel)

#### Node.js

To create a simple Node server, install the [`@sveltejs/adapter-node@next`](https://github.com/sveltejs/kit/tree/master/packages/adapter-node) package and update your `svelte.config.js`:

```diff
/// file: svelte.config.js
-import adapter from '@sveltejs/adapter-auto';
+import adapter from '@sveltejs/adapter-node';
```

With this, [svelte-kit build](/docs/cli#svelte-kit-build) will generate a self-contained Node app inside the `build` directory. You can pass options to adapters, such as customising the output directory:

```diff
/// file: svelte.config.js
import adapter from '@sveltejs/adapter-node';

export default {
	kit: {
-		adapter: adapter()
+		adapter: adapter({ out: 'my-output-directory' })
	}
};
```

#### Static sites

Most adapters will generate static HTML for any [prerenderable](/docs/page-options#prerender) pages of your site. In some cases, your entire app might be prerenderable, in which case you can use [`@sveltejs/adapter-static@next`](https://github.com/sveltejs/kit/tree/master/packages/adapter-static) to generate static HTML for _all_ your pages. A fully static site can be hosted on a wide variety of platforms, including static hosts like [GitHub Pages](https://pages.github.com/).

```diff
/// file: svelte.config.js
-import adapter from '@sveltejs/adapter-auto';
+import adapter from '@sveltejs/adapter-static';
```

You can also use `adapter-static` to generate single-page apps (SPAs) by specifying a [fallback page](https://github.com/sveltejs/kit/tree/master/packages/adapter-static#spa-mode).

> You must ensure [`trailingSlash`](configuration#trailingslash) is set appropriately for your environment. If your host does not render `/a.html` upon receiving a request for `/a` then you will need to set `trailingSlash: 'always'` to create `/a/index.html` instead.

#### Platform-specific context

Some adapters may have access to additional information about the request. For example, Cloudflare Workers can access an `env` object containing KV namespaces etc. This can be passed to the `RequestEvent` used in [hooks](/docs/hooks) and [endpoints](/docs/routing#endpoints) as the `platform` property — consult each adapter's documentation to learn more.

### Community adapters

Additional [community-provided adapters](https://sveltesociety.dev/components#adapters) exist for other platforms. After installing the relevant adapter with your package manager, update your `svelte.config.js`:

```diff
/// file: svelte.config.js
-import adapter from '@sveltejs/adapter-auto';
+import adapter from 'svelte-adapter-[x]';
```

### Writing custom adapters

We recommend [looking at the source for an adapter](https://github.com/sveltejs/kit/tree/master/packages) to a platform similar to yours and copying it as a starting point.

Adapters packages must implement the following API, which creates an `Adapter`:

```js
// @filename: ambient.d.ts
const AdapterSpecificOptions = any;

// @filename: index.js
// ---cut---
/** @param {AdapterSpecificOptions} options */
export default function (options) {
	/** @type {import('@sveltejs/kit').Adapter} */
	const adapter = {
		name: 'adapter-package-name',
		async adapt(builder) {
			// adapter implementation
		}
	};

	return adapter;
}
```

The types for `Adapter` and its parameters are available in [types/config.d.ts](https://github.com/sveltejs/kit/blob/master/packages/kit/types/config.d.ts).

Within the `adapt` method, there are a number of things that an adapter should do:

- Clear out the build directory
- Write SvelteKit output with `builder.writeClient`, `builder.writePrerendered`, `builder.writeServer`, and `builder.writeStatic`
- Output code that:
  - Imports `App` from `${builder.getServerDirectory()}/app.js`
  - Instantiates the app with a manifest generated with `builder.generateManifest({ relativePath })`
  - Listens for requests from the platform, converts them to a standard [Request](https://developer.mozilla.org/en-US/docs/Web/API/Request) if necessary, calls the `render` function to generate a [Response](https://developer.mozilla.org/en-US/docs/Web/API/Response) and responds with it
  - expose any platform-specific information to SvelteKit via the `platform` option passed to `app.render`
  - Globally shims `fetch` to work on the target platform, if necessary. SvelteKit provides a `@sveltejs/kit/install-fetch` helper for platforms that can use `node-fetch`
- Bundle the output to avoid needing to install dependencies on the target platform, if necessary
- Put the user's static files and the generated JS/CSS in the correct location for the target platform

Where possible, we recommend putting the adapter output under the `build/` directory with any intermediate output placed under `.svelte-kit/[adapter-name]`.

> The adapter API may change before 1.0.
