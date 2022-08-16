---
title: Advanced routing
---

### Rest parameters

If the number of route segments is unknown, you can use rest syntax — for example you might implement GitHub's file viewer like so...

```bash
/[org]/[repo]/tree/[branch]/[...file]
```

...in which case a request for `/sveltejs/kit/tree/master/documentation/docs/04-advanced-routing.md` would result in the following parameters being available to the page:

```js
// @noErrors
{
	org: 'sveltejs',
	repo: 'kit',
	branch: 'master',
	file: 'documentation/docs/04-advanced-routing.md'
}
```

This also allows you to render custom 404s. Given these routes...

```
src/routes/
├ marx-brothers/
│ ├ chico/
│ ├ harpo/
│ ├ groucho/
│ └ +error.svelte
└ +error.svelte
```

...the `marx-brothers/+error.svelte` file will _not_ be rendered if you visit `/marx-brothers/karl`, because no route was matched. If you want to render the nested error page, you should create a route that matches any `/marx-brothers/*` request, and return a 404 from it:

```diff
src/routes/
├ marx-brothers/
+| ├ [...path]/
│ ├ chico/
│ ├ harpo/
│ ├ groucho/
│ └ +error.svelte
└ +error.svelte
```

> `src/routes/a/[...rest]/z/+page.svelte` will match `/a/z` (i.e. there's no parameter at all) as well as `/a/b/z` and `/a/b/c/z` and so on. Make sure you check that the value of the rest parameter is valid, for example using a [matcher](#advanced-routing-matching).

### Matching

A route like `src/routes/archive/[page]` would match `/archive/3`, but it would also match `/archive/potato`. We don't want that. You can ensure that route parameters are well-formed by adding a _matcher_ — which takes the parameter string (`"3"` or `"potato"`) and returns `true` if it is valid — to your [`params`](/docs/configuration#files) directory...

```js
/// file: src/params/integer.js
/** @type {import('@sveltejs/kit').ParamMatcher} */
export function match(param) {
	return /^\d+$/.test(param);
}
```

...and augmenting your routes:

```diff
-src/routes/archive/[page]
+src/routes/archive/[page=integer]
```

If the pathname doesn't match, SvelteKit will try to match other routes (using the sort order specified below), before eventually returning a 404.

> Matchers run both on the server and in the browser.

### Sorting

It's possible for multiple routes to match a given path. For example each of these routes would match `/foo-abc`:

```bash
src/routes/[...catchall]/+page.svelte
src/routes/[a]/+server.js
src/routes/[b]/+page.svelte
src/routes/foo-[c]/+page.svelte
src/routes/foo-abc/+page.svelte
```

SvelteKit needs to know which route is being requested. To do so, it sorts them according to the following rules...

- More specific routes are higher priority (e.g. a route with no parameters is more specific than a route with one dynamic parameter, and so on)
- `+server` files have higher priority than `+page` files
- Parameters with [matchers](#advanced-routing-matching) (`[name=type]`) are higher priority than those without (`[name]`)
- Rest parameters have lowest priority
- Ties are resolved alphabetically

...resulting in this ordering, meaning that `/foo-abc` will invoke `src/routes/foo-abc/+page.svelte`, and `/foo-def` will invoke `src/routes/foo-[c]/+page.svelte` rather than less specific routes:

```bash
src/routes/foo-abc/+page.svelte
src/routes/foo-[c]/+page.svelte
src/routes/[a]/+server.js
src/routes/[b]/+page.svelte
src/routes/[...catchall]/+page.svelte
```

### Encoding

Directory names are URI-decoded, meaning that (for example) a directory like `%40[username]` would match characters beginning with `@`:

```js
// @filename: ambient.d.ts
declare global {
	const assert: {
		equal: (a: any, b: any) => boolean;
	};
}

export {};

// @filename: index.js
// ---cut---
assert.equal(
	decodeURIComponent('%40[username]'),
	'@[username]'
);
```

To express a `%` character, use `%25`, otherwise the result will be malformed.

### Named layouts

Some parts of your app might need something other than the default layout. For these cases you can create _named layouts_...

```svelte
/// file: src/routes/+layout-foo.svelte
<div class="foo">
	<slot></slot>
</div>
```

...and then use them by referencing the layout name (`foo`, in the example above) in the filename:

```svelte
/// file: src/routes/my-special-page/+page@foo.svelte
<h1>I am inside +layout-foo</h1>
```

> Named layout should only be referenced from Svelte files

Named layouts are very powerful, but it can take a minute to get your head round them. Don't worry if this doesn't make sense all at once.

#### Scoping

Named layouts can be created at any depth, and will apply to any components in the same subtree. For example, `+layout-foo` will apply to `/x/one` and `/x/two`, but not `/x/three` or `/four`:

```bash
src/routes/
├ x/
│ ├ +layout-foo.svelte
│ ├ one/+page@foo.svelte       # ✅ page has `@foo`
│ ├ two/+page@foo.svelte       # ✅ page has `@foo`
│ └ three/+page.svelte         # ❌ page does not have `@foo`
└ four/+page@foo.svelte        # ❌ page has `@foo`, but +layout-foo is not 'in scope'
```

#### Inheritance chains

Layouts can themselves choose to inherit from named layouts, from the same directory or a parent directory. For example, `x/y/+layout@root.svelte` is the default layout for `/x/y` (meaning `/x/y/one`, `/x/y/two` and `/x/y/three` all inherit from it) because it has no name. Because it specifies `@root`, it will inherit directly from the nearest `+layout-root.svelte`, skipping `+layout.svelte` and `x/+layout.svelte`.

```
src/routes/
├ x/
│ ├ y/
│ │ ├ +layout@root.svelte
│ │ ├ one/+page.svelte
│ │ ├ two/+page.svelte
│ │ └ three/+page.svelte
│ └ +layout.svelte
├ +layout.svelte
└ +layout-root.svelte
```

> In the case where `+layout-root.svelte` contains a lone `<slot />`, this effectively means we're able to 'reset' to a blank layout for any page or nested layout in the app by adding `@root`.

If no parent is specified, a layout will inherit from the nearest default (i.e. unnamed) layout _above_ it in the tree. In some cases, it's helpful for a named layout to inherit from a default layout _alongside_ it in the tree, such as `+layout-root.svelte` inheriting from `+layout.svelte`. We can do this by explicitly specifying `@default`, allowing `/x/y/one` and siblings to use the app's default layout without using `x/+layout.svelte`:

```diff
src/routes/
├ x/
│ ├ y/
│ │ ├ +layout@root.svelte
│ │ ├ one/+page.svelte
│ │ ├ two/+page.svelte
│ │ └ three/+page.svelte
│ └ +layout.svelte
├ +layout.svelte
-└ +layout-root.svelte
+└ +layout-root@default.svelte
```

> `default` is a reserved name — in other words, you can't have a `+layout-default.svelte` file.
