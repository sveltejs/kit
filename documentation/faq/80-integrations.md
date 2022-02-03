---
title: How do I use X with SvelteKit?
---

Make sure you've read the [documentation section on integrations](/docs#additional-resources-integrations). If you're still having trouble, solutions to common issues are listed below.

### How do I setup a database?

Put the code to query your database in [endpoints](/docs#routing-endpoints) - don't query the database in .svelte files. You can create a `db.js` or similar that sets up a connection immediately and makes the client accessible throughout the app as a singleton. You can execute any one-time setup code in `hooks.js` and import your database helpers into any endpoint that needs them.

### How do I use middleware?

`adapter-node` builds a middleware that you can use with your own server for production mode. In dev, you can add middleware to Vite by using a Vite plugin. For example:

```js
const myPlugin = {
	name: 'log-request-middleware',
	configureServer(server) {
		server.middlewares.use((req, res, next) => {
			console.log(`Got request ${req.url}`);
			next();
		});
	}
};

/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: {
		vite: {
			plugins: [myPlugin]
		}
	}
};

export default config;
```

See [Vite's `configureServer` docs](https://vitejs.dev/guide/api-plugin.html#configureserver) for more details including how to control ordering.

### How do I use a client-side only library that depends on `document` or `window`?

If you need access to the `document` or `window` variables or otherwise need code to run only on the client-side you can wrap it in a `browser` check:

```js
import { browser } from '$app/env';

if (browser) {
	// client-only code here
}
```

You can also run code in `onMount` if you'd like to run it after the component has been first rendered to the DOM:

```js
import { onMount } from 'svelte';

onMount(async () => {
	const { method } = await import('some-browser-only-library');
	method('hello world');
});
```

If the library you'd like to use is side-effect free you can also statically import it and it will be tree-shaken out in the server-side build where `onMount` will be automatically replaced with a no-op:

```js
import { onMount } from 'svelte';
import { method } from 'some-browser-only-library';

onMount(() => {
	method('hello world');
});
```

Otherwise, if the library has side effects and you'd still prefer to use static imports, check out [vite-plugin-iso-import](https://github.com/bluwy/vite-plugin-iso-import) to support the `?client` import suffix. The import will be stripped out in SSR builds. However, note that you will lose the ability to use VS Code Intellisense if you use this method.

```js
import { onMount } from 'svelte';
import { method } from 'some-browser-only-library?client';

onMount(() => {
	method('hello world');
});
```

### Does it work with Yarn 2?

Sort of. The Plug'n'Play feature, aka 'pnp', is broken (it deviates from the Node module resolution algorithm, and [doesn't yet work with native JavaScript modules](https://github.com/yarnpkg/berry/issues/638) which SvelteKit — along with an [increasing number of packages](https://blog.sindresorhus.com/get-ready-for-esm-aa53530b3f77) — uses). You can use `nodeLinker: 'node-modules'` in your [`.yarnrc.yml`](https://yarnpkg.com/configuration/yarnrc#nodeLinker) file to disable pnp, but it's probably easier to just use npm or [pnpm](https://pnpm.io/), which is similarly fast and efficient but without the compatibility headaches.
