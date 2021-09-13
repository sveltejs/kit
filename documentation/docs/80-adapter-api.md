---
title: Writing an Adapter
---

We recommend [looking at the source for an adapter](https://github.com/sveltejs/kit/tree/master/packages) to a platform similar to yours and copying it as a starting point.

Adapters packages must implement the following API, which creates an `Adapter`:

```js
/**
 * @param {AdapterSpecificOptions} options
 */
export default function (options) {
	/** @type {import('@sveltejs/kit').Adapter} */
	return {
		name: 'adapter-package-name',
		async adapt({ utils, config }) {
			// adapter implementation
		}
	};
}
```

The types for `Adapter` and its parameters are available in [types/config.d.ts](https://github.com/sveltejs/kit/blob/master/packages/kit/types/config.d.ts).

Within the `adapt` method, there are a number of things that an adapter should do:

- Clear out the build directory
- Output code that:
  - Calls `init`
  - Converts from the platform's request to a [SvelteKit request](#hooks-handle), calls `render`, and converts from a [SvelteKit response](#hooks-handle) to the platform's
    - If `config.kit.cspNonce` is set, it should also generate a base64 cryptographically secure random string with at least 128 bits of entropy for use as a nonce and supply it in the `render` call. This _must_ be unique for every request. Most platforms support either Node's `crypto` module or the Web Crypto API.
  - Globally shims `fetch` to work on the target platform. SvelteKit provides a `@sveltejs/kit/install-fetch` helper for platforms that can use `node-fetch`
- Bundle the output to avoid needing to install dependencies on the target platform, if desired
- Call `utils.prerender`
- Put the user's static files and the generated JS/CSS in the correct location for the target platform

If possible, we recommend putting the adapter output under the `build/` directory with any intermediate output placed under `'.svelte-kit/' + adapterName`.

> The adapter API may change before 1.0.
