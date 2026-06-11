---
title: Adapters
---

Before you can deploy your SvelteKit app, you need to _adapt_ it for your deployment target. Adapters are small plugins that take the built app as input and generate output for deployment.

Official adapters exist for a variety of platforms — these are documented on the following pages:

- [`@sveltejs/adapter-cloudflare`](adapter-cloudflare) for Cloudflare Workers and Cloudflare Pages
- [`@sveltejs/adapter-netlify`](adapter-netlify) for Netlify
- [`@sveltejs/adapter-node`](adapter-node) for Node servers
- [`@sveltejs/adapter-static`](adapter-static) for static site generation (SSG)
- [`@sveltejs/adapter-vercel`](adapter-vercel) for Vercel

Additional [community-provided adapters](/packages#sveltekit-adapters) exist for other platforms.

## Using adapters

Your adapter is specified in `vite.config.js`:

```js
/// file: vite.config.js
// @filename: ambient.d.ts
declare module 'svelte-adapter-foo' {
	const adapter: (opts?: any) => import('@sveltejs/kit').Adapter;
	export default adapter;
}

// @errors: 2554
// @filename: index.js
// ---cut---
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
+++import adapter from 'svelte-adapter-foo';+++

export default defineConfig({
	plugins: [
		sveltekit({
			+++adapter: adapter()+++
		})
	]
});
```

## Platform-specific context

Some adapters may have access to additional information about the request. For example, Cloudflare Workers can access an `env` object containing KV namespaces etc. This can be passed to the `RequestEvent` used in [hooks](hooks) and [server routes](routing#server) as the `platform` property — consult each adapter's documentation to learn more.
