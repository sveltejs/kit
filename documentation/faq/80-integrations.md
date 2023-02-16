---
title: How do I use X with SvelteKit?
---

Make sure you've read the [documentation section on integrations](docs/integrations). If you're still having trouble, solutions to common issues are listed below.

### How do I setup a database?

Put the code to query your database in a [server route](docs/routing#server) - don't query the database in .svelte files. You can create a `db.js` or similar that sets up a connection immediately and makes the client accessible throughout the app as a singleton. You can execute any one-time setup code in `hooks.js` and import your database helpers into any endpoint that needs them.

### How do I use a client-side only library that depends on `document` or `window`?

If you need access to the `document` or `window` variables or otherwise need code to run only on the client-side you can wrap it in a `browser` check:

```js
/// <reference types="@sveltejs/kit" />
// ---cut---
import { browser } from '$app/environment';

if (browser) {
	// client-only code here
}
```

You can also run code in `onMount` if you'd like to run it after the component has been first rendered to the DOM:

```js
// @filename: ambient.d.ts
// @lib: ES2015
declare module 'some-browser-only-library';

// @filename: index.js
// ---cut---
import { onMount } from 'svelte';

onMount(async () => {
	const { method } = await import('some-browser-only-library');
	method('hello world');
});
```

If the library you'd like to use is side-effect free you can also statically import it and it will be tree-shaken out in the server-side build where `onMount` will be automatically replaced with a no-op:

```js
// @filename: ambient.d.ts
// @lib: ES2015
declare module 'some-browser-only-library';

// @filename: index.js
// ---cut---
import { onMount } from 'svelte';
import { method } from 'some-browser-only-library';

onMount(() => {
	method('hello world');
});
```

Otherwise, if the library has side effects and you'd still prefer to use static imports, check out [vite-plugin-iso-import](https://github.com/bluwy/vite-plugin-iso-import) to support the `?client` import suffix. The import will be stripped out in SSR builds. However, note that you will lose the ability to use VS Code Intellisense if you use this method.

```js
// @filename: ambient.d.ts
// @lib: ES2015
declare module 'some-browser-only-library?client';

// @filename: index.js
// ---cut---
import { onMount } from 'svelte';
import { method } from 'some-browser-only-library?client';

onMount(() => {
	method('hello world');
});
```

### How do I use a different backend API server?

You can use [`event.fetch`](docs/load#making-fetch-requests) to request data from an external API server, but be aware that you would need to deal with [CORS](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS), which will result in complications such as generally requiring requests to be preflighted resulting in higher latency. Requests to a separate subdomain may also increase latency due to an additional DNS lookup, TLS setup, etc. If you wish to use this method, you may find [`handleFetch`](docs/hooks#server-hooks-handlefetch) helpful.

Another approach is to set up a proxy to bypass CORS headaches. In production, you would rewrite a path like `/api` to the API server; for local development, use Vite's [`server.proxy`](https://vitejs.dev/config/server-options.html#server-proxy) option.

How to setup rewrites in production will depend on your deployment platform. If rewrites aren't an option, you could alternatively add an [API route](https://kit.svelte.dev/docs/routing#server):

```js
/// file: src/routes/api/[...path]/+server.js
/** @type {import('./$types').RequestHandler} */
export function GET({ params, url }) {
	return fetch(`https://my-api-server.com/${params.path + url.search}`);
}
```

(Note that you may also need to proxy `POST`/`PATCH` etc requests, and forward `request.headers`, depending on your needs.)

### How do I use middleware?

`adapter-node` builds a middleware that you can use with your own server for production mode. In dev, you can add middleware to Vite by using a Vite plugin. For example:

```js
// @filename: ambient.d.ts
declare module '@sveltejs/kit/vite'; // TODO this feels unnecessary, why can't it 'see' the declarations?

// @filename: index.js
// ---cut---
import { sveltekit } from '@sveltejs/kit/vite';

/** @type {import('vite').Plugin} */
const myPlugin = {
	name: 'log-request-middleware',
	configureServer(server) {
		server.middlewares.use((req, res, next) => {
			console.log(`Got request ${req.url}`);
			next();
		});
	}
};

/** @type {import('vite').UserConfig} */
const config = {
	plugins: [myPlugin, sveltekit()]
};

export default config;
```

See [Vite's `configureServer` docs](https://vitejs.dev/guide/api-plugin.html#configureserver) for more details including how to control ordering.

### Does it work with Yarn 2?

Sort of. The Plug'n'Play feature, aka 'pnp', is broken (it deviates from the Node module resolution algorithm, and [doesn't yet work with native JavaScript modules](https://github.com/yarnpkg/berry/issues/638) which SvelteKit — along with an [increasing number of packages](https://blog.sindresorhus.com/get-ready-for-esm-aa53530b3f77) — uses). You can use `nodeLinker: 'node-modules'` in your [`.yarnrc.yml`](https://yarnpkg.com/configuration/yarnrc#nodeLinker) file to disable pnp, but it's probably easier to just use npm or [pnpm](https://pnpm.io/), which is similarly fast and efficient but without the compatibility headaches.

### How do I use with Yarn 3?

Currently ESM Support within the latest Yarn (version 3) is considered [experimental](https://github.com/yarnpkg/berry/pull/2161).

The below seems to work although your results may vary.

First create a new application:

```sh
yarn create svelte myapp
cd myapp
```

And enable Yarn Berry:

```sh
yarn set version berry
yarn install
```

**Yarn 3 global cache**

One of the more interesting features of Yarn Berry is the ability to have a single global cache for packages, instead of having multiple copies for each project on the disk. However, setting `enableGlobalCache` to true causes building to fail, so it is recommended to add the following to the `.yarnrc.yml` file:

```
nodeLinker: node-modules
```

This will cause packages to be downloaded into a local node_modules directory but avoids the above problem and is your best bet for using version 3 of Yarn at this point in time.
