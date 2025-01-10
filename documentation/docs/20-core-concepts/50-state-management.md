---
title: State management
---

If you're used to building client-only apps, state management in an app that spans server and client might seem intimidating. This section provides tips for avoiding some common gotchas.

## Avoid shared state on the server

Browsers are _stateful_ — state is stored in memory as the user interacts with the application. Servers, on the other hand, are _stateless_ — the content of the response is determined entirely by the content of the request.

Conceptually, that is. In reality, servers are often long-lived and shared by multiple users. For that reason it's important not to store data in shared variables. For example, consider this code:

```js
// @errors: 7034 7005
/// file: +page.server.js
let user;

/** @type {import('./$types').PageServerLoad} */
export function load() {
	return { user };
}

/** @satisfies {import('./$types').Actions} */
export const actions = {
	default: async ({ request }) => {
		const data = await request.formData();

		// NEVER DO THIS!
		user = {
			name: data.get('name'),
			embarrassingSecret: data.get('secret')
		};
	}
}
```

The `user` variable is shared by everyone who connects to this server. If Alice submitted an embarrassing secret, and Bob visited the page after her, Bob would know Alice's secret. In addition, when Alice returns to the site later in the day, the server may have restarted, losing her data.

Instead, you should _authenticate_ the user using [`cookies`](load#Cookies) and persist the data to a database.

## No side-effects in load

For the same reason, your `load` functions should be _pure_ — no side-effects (except maybe the occasional `console.log(...)`). For example, you might be tempted to write to a store or global state inside a `load` function so that you can use the value in your components:

```js
/// file: +page.js
// @filename: ambient.d.ts
declare module '$lib/user' {
	export const user: { set: (value: any) => void };
}

// @filename: index.js
// ---cut---
import { user } from '$lib/user';

/** @type {import('./$types').PageLoad} */
export async function load({ fetch }) {
	const response = await fetch('/api/user');

	// NEVER DO THIS!
	user.set(await response.json());
}
```

As with the previous example, this puts one user's information in a place that is shared by _all_ users. Instead, just return the data...

```js
/// file: +page.js
/** @type {import('./$types').PageServerLoad} */
export async function load({ fetch }) {
	const response = await fetch('/api/user');

+++	return {
		user: await response.json()
	};+++
}
```

...and pass it around to the components that need it, or use [`page.data`](load#page.data).

If you're not using SSR, then there's no risk of accidentally exposing one user's data to another. But you should still avoid side-effects in your `load` functions — your application will be much easier to reason about without them.

## Using state and stores with context

You might wonder how we're able to use `page.data` and other [app state]($app-state) (or [app stores]($app-stores)) if we can't use global state. The answer is that app state and app stores on the server use Svelte's [context API](/tutorial/svelte/context-api) — the state (or store) is attached to the component tree with `setContext`, and when you subscribe you retrieve it with `getContext`. We can do the same thing with our own state:

```svelte
<!--- file: src/routes/+layout.svelte --->
<script>
	import { setContext } from 'svelte';

	/** @type {{ data: import('./$types').LayoutData }} */
	let { data } = $props();

	// Pass a function referencing our state
	// to the context for child components to access
	setContext('user', () => data.user);
</script>
```

```svelte
<!--- file: src/routes/user/+page.svelte --->
<script>
	import { getContext } from 'svelte';

	// Retrieve user store from context
	const user = getContext('user');
</script>

<p>Welcome {user().name}</p>
```

> [!NOTE] We're passing a function into `setContext` to keep reactivity across boundaries. Read more about it [here](/docs/svelte/$state#Passing-state-into-functions)

> [!LEGACY]
> You also use stores from `svelte/store` for this, but when using Svelte 5 it is recommended to make use of universal reactivity instead.

Updating the value of context-based state in deeper-level pages or components while the page is being rendered via SSR will not affect the value in the parent component because it has already been rendered by the time the state value is updated. In contrast, on the client (when CSR is enabled, which is the default) the value will be propagated and components, pages, and layouts higher in the hierarchy will react to the new value. Therefore, to avoid values 'flashing' during state updates during hydration, it is generally recommended to pass state down into components rather than up.

If you're not using SSR (and can guarantee that you won't need to use SSR in future) then you can safely keep state in a shared module, without using the context API.

## Component and page state is preserved

When you navigate around your application, SvelteKit reuses existing layout and page components. For example, if you have a route like this...

```svelte
<!--- file: src/routes/blog/[slug]/+page.svelte --->
<script>
	/** @type {{ data: import('./$types').PageData }} */
	let { data } = $props();

	// THIS CODE IS BUGGY!
	const wordCount = data.content.split(' ').length;
	const estimatedReadingTime = wordCount / 250;
</script>

<header>
	<h1>{data.title}</h1>
	<p>Reading time: {Math.round(estimatedReadingTime)} minutes</p>
</header>

<div>{@html data.content}</div>
```

...then navigating from `/blog/my-short-post` to `/blog/my-long-post` won't cause the layout, page and any other components within to be destroyed and recreated. Instead the `data` prop (and by extension `data.title` and `data.content`) will update (as it would with any other Svelte component) and, because the code isn't rerunning, lifecycle methods like `onMount` and `onDestroy` won't rerun and `estimatedReadingTime` won't be recalculated.

Instead, we need to make the value [_reactive_](/tutorial/svelte/state):

```svelte
/// file: src/routes/blog/[slug]/+page.svelte
<script>
	/** @type {{ data: import('./$types').PageData }} */
	let { data } = $props();

+++	let wordCount = $derived(data.content.split(' ').length);
	let estimatedReadingTime = $derived(wordCount / 250);+++
</script>
```

> [!NOTE] If your code in `onMount` and `onDestroy` has to run again after navigation you can use [afterNavigate]($app-navigation#afterNavigate) and [beforeNavigate]($app-navigation#beforeNavigate) respectively.

Reusing components like this means that things like sidebar scroll state are preserved, and you can easily animate between changing values. In the case that you do need to completely destroy and remount a component on navigation, you can use this pattern:

```svelte
<script>
	import { page } from '$app/state';
</script>

{#key page.url.pathname}
	<BlogPost title={data.title} content={data.title} />
{/key}
```

## Storing state in the URL

If you have state that should survive a reload and/or affect SSR, such as filters or sorting rules on a table, URL search parameters (like `?sort=price&order=ascending`) are a good place to put them. You can put them in `<a href="...">` or `<form action="...">` attributes, or set them programmatically via `goto('?key=value')`. They can be accessed inside `load` functions via the `url` parameter, and inside components via `page.url.searchParams`.

## Storing ephemeral state in snapshots

Some UI state, such as 'is the accordion open?', is disposable — if the user navigates away or refreshes the page, it doesn't matter if the state is lost. In some cases, you _do_ want the data to persist if the user navigates to a different page and comes back, but storing the state in the URL or in a database would be overkill. For this, SvelteKit provides [snapshots](snapshots), which let you associate component state with a history entry.
