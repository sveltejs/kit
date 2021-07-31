---
question: How do I use X with SvelteKit?
---

### How do I setup library X?

Please see [sveltejs/integrations](https://github.com/sveltejs/integrations#sveltekit) for examples of using many popular libraries like Tailwind, PostCSS, Firebase, GraphQL, mdsvex, and more.

### How do I use `svelte-preprocess`?

`svelte-preprocess` provides support for Babel, CoffeeScript, Less, PostCSS / SugarSS, Pug, scss/sass, Stylus, TypeScript, `global` styles, and replace. Adding [svelte-preprocess](https://github.com/sveltejs/svelte-preprocess) to your [`svelte.config.js`](#configuration) is the first step. It is provided by the template if you're using TypeScript. JavaScript users will need to add it. For many of the tools listed above, you will then only need to install the corresponding library such as `npm install -D sass`or `npm install -D less`. See the [svelte-preprocess](https://github.com/sveltejs/svelte-preprocess) docs for full details.

Also see [sveltejs/integrations](https://github.com/sveltejs/integrations#sveltekit) for examples of setting up these and similar libraries.

### How do I use Firebase?

Please use SDK v9 which provides a modular SDK approach that's currently in beta. The old versions are very difficult to get working especially with SSR and also resulted in a much larger client download size.

### How do I use a client-side only library that depends on `document` or `window`?

Vite will attempt to process all imported libraries and may fail when encountering a library that is not compatible with SSR. [This currently occurs even when SSR is disabled](https://github.com/sveltejs/kit/issues/754).

If you need access to the `document` or `window` variables or otherwise need it to run only on the client-side you can wrap it in a `browser` check:

```js
import { browser } from '$app/env';

if (browser) {
	// client-only code here
}
```

You can also run code in `onMount` if you'd like to run it after the component has been first rendered to the DOM. In this case, you may still find a benefit of including a `browser` check as shown below because Vite may otherwise attempt to optimize the dependency and fail on it. [We hope to make this unnecessary in the future](https://github.com/sveltejs/svelte/issues/6372).

```html
<script>
	import { onMount } from 'svelte';
	import { browser } from '$app/env';

	let lib;

	if (browser) {
		onMount(async () => {
			lib = (await import('some-browser-only-library')).default;
		});
	}
</script>
```

### How do I setup a database?

Put the code to query your database in [endpoints](/docs#routing-endpoints) - don't query the database in .svelte files. You can create a `db.js` or similar that sets up a connection immediately and makes the client accessible throughout the app as a singleton. You can execute any one-time setup code in `hooks.js` and import your database helpers into any endpoint that needs them.

### Does it work with Yarn 2?

Sort of. The Plug'n'Play feature, aka 'pnp', is broken (it deviates from the Node module resolution algorithm, and [doesn't yet work with native JavaScript modules](https://github.com/yarnpkg/berry/issues/638) which SvelteKit — along with an [increasing number of packages](https://blog.sindresorhus.com/get-ready-for-esm-aa53530b3f77) — uses). You can use `nodeLinker: 'node-modules'` in your [`.yarnrc.yml`](https://yarnpkg.com/configuration/yarnrc#nodeLinker) file to disable pnp, but it's probably easier to just use npm or [pnpm](https://pnpm.io/), which is similarly fast and efficient but without the compatibility headaches.
