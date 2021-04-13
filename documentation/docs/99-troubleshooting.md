---
title: Troubleshooting
---

### Dealing with `Error when evaluating SSR module` / `ReferenceError: require is not defined` errors

Most of these issues come from Vite trying to deal with non-ESM libraries. You may find helpful examples in [the Vite issue tracker](https://github.com/vitejs/vite/issues). 

The most common solutions:

1. Try moving the package between `dependencies` and `devDependencies`
2. Try to `include` or `exclude` it in `optimizeDeps`
3. Try to find an ESM build of the package, if available. If not available, you should also consider asking the library author to distribute an ESM version of their package or even converting the source for the package entirely to ESM.

Packages which use `exports` instead of `module.exports` are currently failing due to a [known Vite issue](https://github.com/vitejs/vite/issues/2579). 

You should also add any Svelte components to `ssr.noExternal`. [We hope to do this automatically in the future](https://github.com/sveltejs/kit/issues/904) by detecting the `svelte` field in a package's `package.json`.

### Server-side rendering

SvelteKit will render any component first on the server side and send it to the client as HTML. It will then run the component again on the client side to allow it to update based on dynamic data. This means you need to ensure that components can run both on the client and server side.

If, for example, your components try to access the global variables `document` or `window`, this will result in an error when the page is pre-rendered on the server side.

If you need access to these variables, you can run code exclusively on the client side by wrapping it in

```js
import { browser } from '$app/env';

if (browser) {
	// client-only code here
}
```

Alternatively, you can run it `onMount`, since this only runs in the browser. This is also a good way to load libraries that depend on `window`:

```html
<script>
	import { onMount } from 'svelte';

	let awkward;

	onMount(async () => {
		const module = await import('some-browser-only-library');
		awkward = module.default;
	});
</script>
```
