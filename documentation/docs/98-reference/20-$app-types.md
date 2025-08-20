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

## Asset

A union of all the filenames of assets contained in your `static` directory, plus a `string` wildcard for asset paths generated from `import` declarations.

<div class="ts-block">

```dts
type Asset = '/favicon.png' | '/robots.txt' | (string & {});
```

</div>

## RouteId

A union of all the route IDs in your app. Used for `page.route.id` and `event.route.id`.

<div class="ts-block">

```dts
type RouteId = '/' | '/my-route' | '/my-other-route/[param]';
```

</div>

## Pathname

A union of all valid pathnames in your app.

<div class="ts-block">

```dts
type Pathname = '/' | '/my-route' | `/my-other-route/${string}` & {};
```

</div>

## ResolvedPathname

Similar to `Pathname`, but possibly prefixed with a [base path](configuration#paths). Used for `page.url.pathname`.

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

<div class="ts-block">

```dts
type RouteParams<T extends RouteId> = { /* generated */ } | Record<string, never>;
```

</div>
