---
title: Troubleshooting
---

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
