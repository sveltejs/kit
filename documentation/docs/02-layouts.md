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

Named layouts can be created at any depth, and will apply to any components in the same subtree. For example, `__layout-foo` will apply to `one` and `two`, but not `three` or `four`:

```
src/routes/
├ a/
│ ├ b/
│ │ ├ c/
│ │ │ ├ __layout-foo.svelte
│ │ │ ├ one@foo.svelte
│ │ │ ├ two@foo.svelte
│ │ │ └ three.svelte
│ │ └ four.svelte
```

#### Directories

You can apply a named layout to all pages inside a directory. Here, `one`, `two` and `three` will all inherit from `__layout-foo`, because their parent directory uses `@foo`:

```
src/routes/
├ uses-default-layout.svelte
├ uses-foo-layout@foo/
│ ├ one.svelte
│ ├ two.svelte
│ └ three.svelte
├ __layout.svelte
└ __layout-foo.svelte
```

#### Inheritance chains

Layouts can themselves choose which other layouts they inherit from. Ordinarily, they will inherit from any default layouts 'above' them in the tree, but they can inherit named layouts using the same logic as pages. For example, `a/b/c/page.svelte` will inherit from `__layout-foo.svelte` and `a/b/c/__layout@foo.svelte` but _not_ `__layout.svelte` or `a/b/__layout.svelte`.

```
src/routes/
├ a/
│ ├ b/
│ │ ├ c/
│ │ │ ├ __layout@foo.svelte
│ │ │ └ page.svelte
│ │ └ __layout.svelte
│ ├ __layout.svelte
│ └ __layout-foo.svelte
```

Layouts will inherit from 'sibling' layouts as well as parents — you'll never need to do this, but you _could_:

```
src/routes/
├ __layout.svelte
├ __layout-a@.svelte
├ __layout-b@a.svelte
├ __layout-c@b.svelte
└ nested@c.svelte
```

Here, the inheritance chain would look like this (note that `__layout-a@` points at the unnamed default layout, because no name is specified):

```
__layout.svelte
  __layout-a@.svelte
    __layout-b@a.svelte
      __layout-c@b.svelte
        nested@c.svelte
```

#### Resetting layouts

Sometimes you need a page to use the 'home' layout, regardless of its URL. You can do this by creating a top-level named layout that inherits from the default layout by using `@` without a name:

```
src/routes/
├ a/
│ ├ b/
│ │ ├ c/
│ │ │ └ index@home.svelte
│ │ └ __layout.svelte
│ └ __layout.svelte
│ __layout.svelte
└ __layout-home@.svelte
```

In this case, the `__layout-home@.svelte` component should consist of a single `<slot />`.

### Error pages

If a page fails to load (see [Loading](/docs/loading)), SvelteKit will render an error page. You can customise this page by creating `__error.svelte` components alongside your layouts and pages.

For example, if `src/routes/settings/notifications/index.svelte` failed to load, SvelteKit would render `src/routes/settings/notifications/__error.svelte` in the same layout, if it existed. If not, it would render `src/routes/settings/__error.svelte` in the parent layout, or `src/routes/__error.svelte` in the root layout.

> SvelteKit provides a default error page in case you don't supply `src/routes/__error.svelte`, but it's recommended that you bring your own.

If an error component has a [`load`](/docs/loading) function, it will be called with `error` and `status` properties:

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

> Layouts also have access to `error` and `status` via the [page store](/docs/modules#$app-stores)
>
> Server-side stack traces will be removed from `error` in production, to avoid exposing privileged information to users.
