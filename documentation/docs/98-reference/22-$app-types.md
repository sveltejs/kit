---
title: $app/types
---

This module contains generated types for the routes in your app.

<blockquote class="since note">
	<p>Available since 2.26</p>
</blockquote>

```js
// @noErrors
import type { RouteId, RouteParams, LayoutParams } from '$app/types';
```

## AssetPath

A union of all the filenames of assets contained in your `static` directory, relative to the `base` path.

<div class="ts-block">

```dts
type AssetPath = 'favicon.png' | 'robots.txt' | (string & {});
```

</div>

## RouteId

A union of all the route IDs in your app. Used for `page.route.id` and `event.route.id`.

<div class="ts-block">

```dts
type RouteId = '/' | '/my-route' | '/my-other-route/[param]';
```

</div>

## Path

A union of all valid paths in your app, relative to the `base` path.

<div class="ts-block">

```dts
type Path = '' | 'my-route' | `my-other-route/${string}` & {};
```

</div>

## ResolvedPathname

Similar to `Path`, but prefixed with a [base path](configuration#paths). Used for `page.url.pathname`.

<div class="ts-block">

```dts
type ResolvedPathname = `${'' | `/${string}`}/` | `${'' | `/${string}`}/my-route` | `${'' | `/${string}`}/my-other-route/${string}` | {};
```

</div>

## RouteParams

A utility for getting the parameters associated with a given route.

```ts
// @errors: 2552
type BlogParams = RouteParams<'/blog/[slug]'>; // { slug: string }
```

<div class="ts-block">

```dts
type RouteParams<T extends RouteId> = { /* generated */ } | Record<string, never>;
```

</div>

## LayoutParams

A utility for getting the parameters associated with a given layout, which is similar to `RouteParams` but also includes optional parameters for any child route.

Unlike `RouteId`, this accepts any directory in `src/routes`, since a layout can live in a directory that has no `+page` or `+server` of its own.

<div class="ts-block">

```dts
type LayoutParams<T extends '/' | '/my-route' | '/my-other-route'> = { /* generated */ };
```

</div>
