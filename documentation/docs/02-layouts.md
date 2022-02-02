---
title: Layouts
---

So far, we've treated pages as entirely standalone components — upon navigation, the existing component will be destroyed, and a new one will take its place.

But in many apps, there are elements that should be visible on _every_ page, such as top-level navigation or a footer. Instead of repeating them in every page, we can use _layout_ components.

To create a layout component that applies to every page, make a file called `src/routes/__layout.svelte`. The default layout component (the one that SvelteKit uses if you don't bring your own) looks like this...

```html
<slot></slot>
```

...but we can add whatever markup, styles and behaviour we want. The only requirement is that the component includes a `<slot>` for the page content. For example, let's add a nav bar:

```html
<!-- src/routes/__layout.svelte -->
<nav>
	<a href="/">Home</a>
	<a href="/about">About</a>
	<a href="/settings">Settings</a>
</nav>

<slot></slot>
```

If we create pages for `/`, `/about` and `/settings`...

```html
<!-- src/routes/index.svelte -->
<h1>Home</h1>
```

```html
<!-- src/routes/about.svelte -->
<h1>About</h1>
```

```html
<!-- src/routes/settings.svelte -->
<h1>Settings</h1>
```

...the nav will always be visible, and clicking between the three pages will only result in the `<h1>` being replaced.

### Nested layouts

Suppose we don't just have a single `/settings` page, but instead have nested pages like `/settings/profile` and `/settings/notifications` with a shared submenu (for a real-life example, see [github.com/settings](https://github.com/settings)).

We can create a layout that only applies to pages below `/settings` (while inheriting the root layout with the top-level nav):

```html
<!-- src/routes/settings/__layout.svelte -->
<h1>Settings</h1>

<div class="submenu">
	<a href="/settings/profile">Profile</a>
	<a href="/settings/notifications">Notifications</a>
</div>

<slot></slot>
```

### Resets

To reset the layout stack, create a `__layout.reset.svelte` file instead of a `__layout.svelte` file. For example, if you want your `/admin/*` pages to _not_ inherit the root layout, create a file called `src/routes/admin/__layout.reset.svelte`.

Layout resets are otherwise identical to normal layout components.

### Error pages

If a page fails to load (see [Loading](#loading)), SvelteKit will render an error page. You can customise this page by creating `__error.svelte` components alongside your layout and page components.

For example, if `src/routes/settings/notifications/index.svelte` failed to load, SvelteKit would render `src/routes/settings/notifications/__error.svelte` in the same layout, if it existed. If not, it would render `src/routes/settings/__error.svelte` in the parent layout, or `src/routes/__error.svelte` in the root layout.

> SvelteKit provides a default error page in case you don't supply `src/routes/__error.svelte`, but it's recommended that you bring your own.

```ts
// declaration type
// * also see type for `LoadOutput` in the Loading section

export interface ErrorLoadInput<Params extends Record<string, string> = Record<string, string>>
	extends LoadInput<Params> {
	status?: number;
	error?: Error;
}
```

If an error component has a [`load`](#loading) function, it will be called with `error` and `status` properties:

```html
<script context="module">
	/** @type {import('@sveltejs/kit').ErrorLoad} */
	export function load({ error, status }) {
		return {
			props: {
				title: `${status}: ${error.message}`
			}
		};
	}
</script>

<script>
	export let title;
</script>

<h1>{title}</h1>
```

> Layout components also have access to `error` and `status` via the [page store](#modules-$app-stores)
>
> Server-side stack traces will be removed from `error` in production, to avoid exposing privileged information to users.
