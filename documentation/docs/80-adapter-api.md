---
title: Writing an Adapter
---

We recommend [looking at the source for an adapter](https://github.com/sveltejs/kit/tree/master/packages) to a platform similar to yours and copying it as a starting point.

Adapters packages must implement the following API, which creates an `Adapter`:
```
/**
 * @param {AdapterSpecificOptions} options
 */
export default function (options) {
	/** @type {import('@sveltejs/kit').Adapter} */
	return {
		name: '',
		async adapt({ utils, config }) {
		}
	};
}
```

The types for `Adapter` and its parameters are available in [types/config.d.ts](https://github.com/sveltejs/kit/blob/master/packages/kit/types/config.d.ts).

Within the `adapt` method, there are a number of things that an adapter should do:
- Clear out the build directory
- Provide code that:
  - Calls `init`
  - Converts from the patform's request to a SvelteKit request, call `render`, convert from a SveteKit reponse to the platform's
- Bundle the output to avoid needing to install dependencies on the target platform, etc. if desired
- Globally shim `fetch` to work on the target platform. SvelteKit provides a `@sveltejs/kit/install-fetch` helper to use `node-fetch`
- Call `prerender`
- Put the user's static files and the generated JS/CSS in the correct location for the target platform

> The adapter API may change before 1.0.
