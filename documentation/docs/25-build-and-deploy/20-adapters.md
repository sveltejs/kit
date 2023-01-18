---
title: Adapters
---

Before you can deploy your SvelteKit app, you need to _adapt_ it for your deployment target. Adapters are small plugins that take the built app as input and generate output for deployment.

By default, projects are configured to use `@sveltejs/adapter-auto`, which detects your production environment and selects the appropriate adapter where possible. If your platform isn't (yet) supported, you may need to [install a platform-specific adapter](#community-adapters) or in rarer cases [write your own](#writing-custom-adapters).

> See the [adapter-auto README](adapter-auto) for information on adding support for new environments.

## Supported environments

SvelteKit offers a number of officially supported adapters.

You can deploy to the following platforms with the default adapter, `adapter-auto`:

- [Cloudflare Pages](https://developers.cloudflare.com/pages/) via [`adapter-cloudflare`](adapter-cloudflare)
- [Netlify](https://netlify.com) via [`adapter-netlify`](adapter-netlify)
- [Vercel](https://vercel.com) via [`adapter-vercel`](adapter-vercel)

### Node.js

To create a simple Node server, install the [`@sveltejs/adapter-node`](adapter-node) package and update your `svelte.config.js`:

```diff
/// file: svelte.config.js
-import adapter from '@sveltejs/adapter-auto';
+import adapter from '@sveltejs/adapter-node';
```

With this, `vite build` will generate a self-contained Node app inside the `build` directory. You can pass options to adapters, such as customising the output directory:

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

### Static sites

Most adapters will generate static HTML for any [prerenderable](/docs/page-options#prerender) pages of your site. In some cases, your entire app might be prerenderable, in which case you can use [`@sveltejs/adapter-static`](adapter-static) to generate static HTML for _all_ your pages. A fully static site can be hosted on a wide variety of platforms, including static hosts like [GitHub Pages](https://pages.github.com/).

```diff
/// file: svelte.config.js
-import adapter from '@sveltejs/adapter-auto';
+import adapter from '@sveltejs/adapter-static';
```

You can also use `adapter-static` to generate single-page apps (SPAs) by specifying a [fallback page and disabling SSR](adapter-static#spa-mode).

> You must ensure [`trailingSlash`](/docs/page-options#trailingslash) is set appropriately for your environment. If your host does not render `/a.html` upon receiving a request for `/a` then you will need to set `trailingSlash: 'always'` to create `/a/index.html` instead.

### Platform-specific context

Some adapters may have access to additional information about the request. For example, Cloudflare Workers can access an `env` object containing KV namespaces etc. This can be passed to the `RequestEvent` used in [hooks](/docs/hooks) and [server routes](/docs/routing#server) as the `platform` property — consult each adapter's documentation to learn more.

## Community adapters

Additional [community-provided adapters](https://sveltesociety.dev/components#adapters) exist for other platforms. After installing the relevant adapter with your package manager, update your `svelte.config.js`:

```diff
/// file: svelte.config.js
-import adapter from '@sveltejs/adapter-auto';
+import adapter from 'svelte-adapter-[x]';
```
