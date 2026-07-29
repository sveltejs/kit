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
		async emulate() {
			return {
				async platform({ config, prerender }) {
					// the returned object becomes `event.platform` during dev, build and
					// preview. Its shape is that of `App.Platform`
				}
			}
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
		// Specify the path of a module to customise request handling
		customHandler: import.meta.resolve('./handler.js'),
		vite: {
			plugins: [
				// add plugins here to integrate with Vite
			]
		}
	};

	return adapter;
}
```

Of these, `name` and `adapt` are required. `emulate`, `customHandler`, `vite.plugins` and `supports` are optional.

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

## Custom request handler

You can customise your server's initialisation and request handling by adding a `customHandler` property resolved to the path of your handler file.

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
		+++customHandler: import.meta.resolve('./src/handler.js')+++
	}

	return adapter;
};
```

The handler file should export a default function that returns a request handler. The should return a `Response` such as by calling `server.respond` along with any [platform-specific context](types#Platform). Optionally, you can pass a different set of environment variables or `read` implementation to `server.init` if your platform supports it.

```js
/// file: src/handler.js
// @errors: 2322
/** @type {import('@sveltejs/kit').SSRHandler} */
export default async function handler(server) {
	// perform setup work here

	return async (request) => {
		// custom request/response handling logic goes here

		return await server.respond(request, {
			...options,
			platform: {
				// the shape of `App.Platform`
			}
		});
	};
}
```
