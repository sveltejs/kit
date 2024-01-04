---
title: Adapters
---

Before you can deploy your SvelteKit app, you need to _adapt_ it for your deployment target. Adapters are small plugins that take the built app as input and generate output for deployment.

Official adapters exist for a variety of platforms — these are documented on the following pages:

- [`@sveltejs/adapter-cloudflare`](adapter-cloudflare) for Cloudflare Pages
- [`@sveltejs/adapter-cloudflare-workers`](adapter-cloudflare-workers) for Cloudflare Workers
- [`@sveltejs/adapter-netlify`](adapter-netlify) for Netlify
- [`@sveltejs/adapter-node`](adapter-node) for Node servers
- [`@sveltejs/adapter-static`](adapter-static) for static site generation (SSG)
- [`@sveltejs/adapter-vercel`](adapter-vercel) for Vercel

Additional [community-provided adapters](https://sveltesociety.dev/packages?category=sveltekit-adapters) exist for other platforms.

## Using adapters

Your adapter is specified in `svelte.config.js`:

```js
/// file: svelte.config.js
// @filename: ambient.d.ts
declare module 'svelte-adapter-foo' {
	const adapter: (opts: any) => import('@sveltejs/kit').Adapter;
	export default adapter;
}

// @filename: index.js
// ---cut---
import adapter from 'svelte-adapter-foo';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: {
		adapter: adapter({
			// adapter options go here
		})
	}
};

export default config;
```

## Platform-specific context

Some adapters may have access to additional information about the request. For example, Cloudflare Workers can access an `env` object containing KV namespaces etc. This can be passed to the `RequestEvent` used in [hooks](hooks) and [server routes](routing#server) as the `platform` property — consult each adapter's documentation to learn more.

