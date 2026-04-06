---
title: Writing adapters
---

If an adapter for your preferred environment doesn't yet exist, you can build your own. We recommend [looking at the source for an adapter](https://github.com/sveltejs/kit/tree/main/packages) to a platform similar to yours and copying it as a starting point.

Adapter packages implement the following API, which creates an `Adapter`:

```js
// @errors: 2322
// @filename: ambient.d.ts
type AdapterSpecificOptions = any;

// @filename: index.js
// ---cut---
/** @param {AdapterSpecificOptions} options */
export default function (options) {
	/** @type {import('@sveltejs/kit').Adapter} */
	const adapter = {
		name: 'adapter-package-name',
		async adapt(builder) {
			// adapter implementation
		},
		supports: {
			read: ({ config, route }) => {
				// Return `true` if the route with the given `config` can use `read`
				// from `$app/server` in production, return `false` if it can't.
				// Or throw a descriptive error describing how to configure the deployment
			},
			instrumentation: () => {
				// Return `true` if this adapter supports loading `instrumentation.server.js`.
				// Return `false if it can't, or throw a descriptive error.
			}
		},
		vite: {
			plugins: [
				// add plugins here to integrate with Vite
			]
		}
	};

	return adapter;
}
```

Of these, `name` and `adapt` are required. `vite.plugins` and `supports` are optional.

Within the `adapt` method, there are a number of things that an adapter should do:

- Clear out the build directory
- Write SvelteKit output with `builder.writeClient`, `builder.writeServer`, and `builder.writePrerendered`
- Output code that:
	- Imports `Server` from `${builder.getServerDirectory()}/index.js`
	- Instantiates the app with a manifest generated with `builder.generateManifest({ relativePath })`
	- Listens for requests from the platform, converts them to a standard [`Request`](https://developer.mozilla.org/en-US/docs/Web/API/Request) if necessary, calls the `server.respond(request, { getClientAddress })` function to generate a [`Response`](https://developer.mozilla.org/en-US/docs/Web/API/Response) and responds with it
	- expose any platform-specific information to SvelteKit via the `platform` option passed to `server.respond`
- Bundle the output to avoid needing to install dependencies on the target platform, if necessary
- Put the user's static files and the generated JS/CSS in the correct location for the target platform

Where possible, we recommend putting the adapter output under the `build/` directory with any intermediate output placed under `.svelte-kit/[adapter-name]`.

## Configuring the development server

By default, SvelteKit runs your server code through a Node.js runtime during development and preview. You can change this by adding a Vite plugin to run code and respond to requests from [a different SSR environment](https://vite.dev/guide/api-environment-runtimes).

The default Vite environment SvelteKit uses is named `ssr`. You can customise it by referencing it in the `config` hook of your Vite plugin.

```js
config(userConfig) {
	userConfig.environments.ssr = { ... }
}
```

You can also create your own server entry file by importing `Server` from `@sveltejs/kit/vite/environment/server` and `env` and `manifest` from `@sveltejs/kit/vite/environment`.

```js
import { Server } from '@sveltejs/kit/vite/environment/server';
import { env, manifest } from '@sveltejs/kit/vite/environment';

const server = new Server(manifest);

await server.init({ env });

/**
 * @param {Request} request
 * @returns {Promise<Response>}
 */
export async function respond(request) {
	return await server.respond(request, {
		getClientAddress: () => {
			throw new Error('Could not determine clientAddress');
		},
		read: (file) => {
			throw new Error('read is not supported in this environment');
		}
	});
}

import.meta.hot?.accept();
```
