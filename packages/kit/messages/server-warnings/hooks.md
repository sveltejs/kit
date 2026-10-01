## handle_error_async_without_async_svelte

> To use an async `handleError` hook to handle errors that occur during rendering, you must enable `compilerOptions.experimental.async` in the SvelteKit plugin of your Vite config. The returned error has been replaced with a generic object

Components render synchronously unless Svelte's [asynchronous mode](https://svelte.dev/docs/svelte/await-expressions) is enabled, so rendering can't wait for a [`handleError`](https://svelte.dev/docs/kit/hooks#Shared-hooks-handleError) hook that returns a promise. The error page is rendered with `{ message: 'Internal Error' }` instead of the hook's result. Enable asynchronous mode in `vite.config.js`:

```js
/// file: vite.config.js
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [
		sveltekit({
			compilerOptions: {
				experimental: { async: true }
			}
		})
	]
});
```

Otherwise, make the hook synchronous, for example by not awaiting the service that it reports errors to.
