---
title: Adapters
---

Before you can deploy your SvelteKit app, you need to _adapt_ it for your deployment target. Adapters are small plugins that take the built app as input and generate output that is optimised for a specific platform.

For example, if you want to run your app as a simple Node server, you would use the `@sveltejs/adapter-node` package:

```js
// svelte.config.js
import node from '@sveltejs/adapter-node';

export default {
	kit: {
		adapter: node()
	}
};
```

With this, [svelte-kit build](#command-line-interface-svelte-kit-build) will generate a self-contained Node app inside `build`. You can pass options to adapters, such as customising the output directory in `adapter-node`:

```diff
// svelte.config.js
import node from '@sveltejs/adapter-node';

export default {
	kit: {
-		adapter: node()
+		adapter: node({ out: 'my-output-directory' })
	}
};
```

A variety of official adapters exist:

- [`@sveltejs/adapter-begin`](https://github.com/sveltejs/kit/tree/master/packages/adapter-begin) — for [Begin](https://begin.com)
- [`@sveltejs/adapter-cloudflare-workers`](https://github.com/sveltejs/kit/tree/master/packages/adapter-cloudflare-workers) — for [Cloudflare Workers](https://developers.cloudflare.com/workers/)
- [`@sveltejs/adapter-netlify`](https://github.com/sveltejs/kit/tree/master/packages/adapter-netlify) — for [Netlify](https://netlify.com)
- [`@sveltejs/adapter-node`](https://github.com/sveltejs/kit/tree/master/packages/adapter-node) — for creating self-contained Node apps
- [`@sveltejs/adapter-static`](https://github.com/sveltejs/kit/tree/master/packages/adapter-static) — for prerendering your entire site as a collection of static files
- [`@sveltejs/adapter-vercel`](https://github.com/sveltejs/kit/tree/master/packages/adapter-vercel) — for [Vercel](https://vercel.com)

And some community adapters:
  - [`svelte-adapter-firebase`](https://github.com/jthegedus/svelte-adapter-firebase) - for [Firebase](https://firebase.google.com/)

> The adapter API is still in flux and will likely change before 1.0.
