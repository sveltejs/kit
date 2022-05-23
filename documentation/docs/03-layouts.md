---
title: Layouts
---

So far, we've treated pages as entirely standalone components — upon navigation, the existing component will be destroyed, and a new one will take its place.

But in many apps, there are elements that should be visible on _every_ page, such as top-level navigation or a footer. Instead of repeating them in every page, we can use _layout_ components.

To create a layout that applies to every page, make a file called `src/routes/__layout.svelte`. The default layout (the one that SvelteKit uses if you don't bring your own) looks like this...

```html
<slot></slot>
```

...but we can add whatever markup, styles and behaviour we want. The only requirement is that the component includes a `<slot>` for the page content. For example, let's add a nav bar:

```html
/// file: src/routes/__layout.svelte
<nav>
	<a href="/">Home</a>
	<a href="/about">About</a>
	<a href="/settings">Settings</a>
</nav>

<slot></slot>
```

If we create pages for `/`, `/about` and `/settings`...

```html
/// file: src/routes/index.svelte
<h1>Home</h1>
```

```html
/// file: src/routes/about.svelte
<h1>About</h1>
```

```html
/// file: src/routes/settings.svelte
<h1>Settings</h1>
```

...the nav will always be visible, and clicking between the three pages will only result in the `<h1>` being replaced.

### Nested layouts

Suppose we don't just have a single `/settings` page, but instead have nested pages like `/settings/profile` and `/settings/notifications` with a shared submenu (for a real-life example, see [github.com/settings](https://github.com/settings)).

We can create a layout that only applies to pages below `/settings` (while inheriting the root layout with the top-level nav):

```html
/// file: src/routes/settings/__layout.svelte
<h1>Settings</h1>

<div class="submenu">
	<a href="/settings/profile">Profile</a>
	<a href="/settings/notifications">Notifications</a>
</div>

<slot></slot>
```

### Named layouts

Some parts of your app might need something other than the default layout. For these cases you can create _named layouts_...

```svelte
/// file: src/routes/__layout-foo.svelte
<div class="foo">
	<slot></slot>
</div>
```

...and then use them by referencing the layout name (`foo`, in the example above) in the filename:

```svelte
/// file: src/routes/my-special-page@foo.svelte
<h1>I am inside __layout-foo</h1>
```

Named layouts are very powerful, but it can take a minute to get your head round them. Don't worry if this doesn't make sense all at once.

#### Scoping

Named layouts can be created at any depth, and will apply to any components in the same subtree. For example, `__layout-foo` will apply to `/x/one` and `/x/two`, but not `/x/three` or `/four`:

```bash
src/routes/
├ x/
│ ├ __layout-foo.svelte
│ ├ one@foo.svelte       # ✅ page has `@foo`
│ ├ two@foo.svelte       # ✅ page has `@foo`
│ └ three.svelte         # ❌ page does not have `@foo`
└ four@foo.svelte        # ❌ page has `@foo`, but __layout-foo is not 'in scope'
```

#### Inheritance chains

Layouts can themselves choose to inherit from named layouts, from the same directory or a parent directory. For example, `x/y/__layout@root.svelte` is the default layout for `/x/y` (meaning `/x/y/one`, `/x/y/two` and `/x/y/three` all inherit from it) because it has no name. Because it specifies `@root`, it will inherit directly from the nearest `__layout-root.svelte`, skipping `__layout.svelte` and `x/__layout.svelte`.

```
src/routes/
├ x/
│ ├ y/
│ │ ├ __layout@root.svelte
│ │ ├ one.svelte
│ │ ├ two.svelte
│ │ └ three.svelte
│ └ __layout.svelte
├ __layout.svelte
└ __layout-root.svelte
```

> In the case where `__layout-root.svelte` contains a lone `<slot />`, this effectively means we're able to 'reset' to a blank layout for any page or nested layout in the app by adding `@root`.

If no parent is specified, a layout will inherit from the nearest default (i.e. unnamed) layout _above_ it in the tree. In some cases, it's helpful for a named layout to inherit from a default layout _alongside_ it in the tree, such as `__layout-root.svelte` inheriting from `__layout.svelte`. We can do this by explicitly specifying `@default`, allowing `/x/y/one` and siblings to use the app's default layout without using `x/__layout.svelte`:

```diff
src/routes/
├ x/
│ ├ y/
│ │ ├ __layout@root.svelte
│ │ ├ one.svelte
│ │ ├ two.svelte
│ │ └ three.svelte
│ └ __layout.svelte
├ __layout.svelte
-└ __layout-root.svelte
+└ __layout-root@default.svelte
```

> `default` is a reserved name — in other words, you can't have a `__layout-default.svelte` file.

### Error pages

If a page fails to load (see [Loading](/docs/loading)), SvelteKit will render an error page. You can customise this page by creating `__error.svelte` components alongside your layouts and pages.

For example, if `src/routes/settings/notifications/index.svelte` failed to load, SvelteKit would render `src/routes/settings/notifications/__error.svelte` in the same layout, if it existed. If not, it would render `src/routes/settings/__error.svelte` in the parent layout, or `src/routes/__error.svelte` in the root layout.

> SvelteKit provides a default error page in case you don't supply `src/routes/__error.svelte`, but it's recommended that you bring your own.

If an error component has a [`load`](/docs/loading) function, it will be called with `error` and `status` properties:

```html
<script context="module">
	/** @type {import('@sveltejs/kit').Load} */
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

> Layouts also have access to `error` and `status` via the [page store](/docs/modules#$app-stores)
>
> Server-side stack traces will be removed from `error` in production, to avoid exposing privileged information to users.

#### 404s

Nested error pages are only rendered when an error occurs while rendering a specific page. In the case of a request that doesn't match any existing route, SvelteKit will render a generic 404 instead. For example, given these routes...

```
src/routes/
├ __error.svelte
├ marx-brothers/
│ ├ __error.svelte
│ ├ chico.svelte
│ ├ harpo.svelte
│ └ groucho.svelte
```

...the `marx-brothers/__error.svelte` file will _not_ be rendered if you visit `/marx-brothers/karl`. If you want to render the nested error page, you should create a route that matches any `/marx-brothers/*` request, and return a 404 from it:

```diff
src/routes/
├ __error.svelte
├ marx-brothers/
│ ├ __error.svelte
+│ ├ [...path].svelte
│ ├ chico.svelte
│ ├ harpo.svelte
│ └ groucho.svelte
```

```svelte
/// file: src/routes/marx-brothers/[...path].svelte
<script context="module">
	/** @type {import('./__types/[...path]').Load} */
	export function load({ params }) {
		return {
			status: 404,
			error: new Error(`Not found: /marx-brothers/${params.path}`)
		};
	}
</script>
```
