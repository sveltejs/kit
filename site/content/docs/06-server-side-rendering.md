---
title: Server-side rendering
---

Sapper will render any component first on the server side and send it to the client as HTML. It will then run the component again on the client side to allow it to update based on dynamic data. This means you need to ensure that components can run both on the client and server side.

If, for example, your components try to access the global variables `document` or `window`, this will result in an error when the page is pre-rendered on the server side.

If you need access to these variables, you can run code exclusively on the client side by wrapping it in

```js
if (typeof window !== 'undefined') {
	// client-only code here
}
```

Alternatively, you can run it `onMount` (see below).

### Third-party libraries that depend on `window`

Sapper works well with most third-party libraries you are likely to come across. However, sometimes libraries have implicit dependencies on `window`.

A third-party library might come bundled in a way which allows it to work with multiple different module loaders. This code might check for the existence of `window.global` and therefore depend on `window`.

Since Sapper will try to execute your component on the server side – where there is no `window` – importing such a module will cause the component to fail. You will get an error message saying `Server-side code is attempting to access the global variable "window"`.

To solve this, you can load the library by importing it in the `onMount` function, which is only called on the client. Since this is a dynamic import you need to use `await import`.

```html
<script>
	import { onMount } from 'svelte';

	let MyComponent;

	onMount(async () => {
		const module = await import('my-non-ssr-component');
		MyComponent = module.default;
	});
</script>

<svelte:component this={MyComponent} foo="bar"/>
```
