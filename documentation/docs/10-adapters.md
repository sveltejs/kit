---
title: Adapters
---

Before you can deploy your SvelteKit app, you need to _adapt_ it for your deployment target. Adapters are small plugins that take the built app as input and generate output that is optimised for a specific platform.

For example, if you want to run your app as a simple Node server, you would use the `@sveltejs/adapter-node` package:

```js
// svelte.config.cjs
const node = require('@sveltejs/adapter-node');

module.exports = {
	kit: {
		adapter: node()
	}
};
```

With this, [svelte-kit build](#command-line-interface-svelte-kit-build) will generate a self-contained Node app inside `build`. You can pass options to adapters, such as customising the output directory in `adapter-node`:

```diff
// svelte.config.cjs
const node = require('@sveltejs/adapter-node');

module.exports = {
	kit: {
-		adapter: node()
+		adapter: node({ out: 'my-output-directory' })
	}
};
```

A variety of official adapters exist for serverless platforms...

- [`adapter-begin`](https://github.com/sveltejs/kit/tree/master/packages/adapter-begin) — for [begin.com](https://begin.com)
- [`adapter-netlify`](https://github.com/sveltejs/kit/tree/master/packages/adapter-netlify) — for [netlify.com](https://netlify.com)
- [`adapter-vercel`](https://github.com/sveltejs/kit/tree/master/packages/adapter-vercel) — for [vercel.com](https://vercel.com)

...and others:

- [`adapter-node`](https://github.com/sveltejs/kit/tree/master/packages/adapter-node) — for creating self-contained Node apps
- [`adapter-static`](https://github.com/sveltejs/kit/tree/master/packages/adapter-static) — for prerendering your entire site as a collection of static files

> The adapter API is still in flux and will likely change before 1.0.
