---
title: $app/types
---

This module contains generated types for the routes in your app.

<blockquote class="since note">
	<p>Available since 2.26</p>
</blockquote>

```js
// @noErrors
import type { RouteId, PageRouteId, EndpointRouteId, RouteParams, LayoutParams } from '$app/types';
```

## AssetPath

A union of all the filenames of assets contained in your `static` directory, relative to the `base` path.

<div class="ts-block">

```dts
type AssetPath = 'favicon.png' | 'robots.txt' | (string & {});
```

</div>

## RouteId

A union of all the route IDs in your app — the union of `PageRouteId` and `EndpointRouteId`. Used for `page.route.id` and `event.route.id`.

<div class="ts-block">

```dts
type RouteId = '/' | '/my-route' | '/my-other-route/[param]' | '/my-endpoint';
```

</div>

## PageRouteId

A union of the route IDs in your app that have a `+page`.

A route ID can be in both `PageRouteId` and `EndpointRouteId`, if its directory contains both a `+page` and a `+server`. In the example below, `/my-route` has both.

<div class="ts-block">

```dts
type PageRouteId = '/' | '/my-route' | '/my-other-route/[param]';
```

</div>

## EndpointRouteId

A union of the route IDs in your app that have a `+server`.

A route ID can be in both `PageRouteId` and `EndpointRouteId`, if its directory contains both a `+page` and a `+server`. In the example below, `/my-route` has both.

<div class="ts-block">

```dts
type EndpointRouteId = '/my-route' | '/my-endpoint';
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

A utility for getting the parameters associated with a given layout, which is similar to `RouteParams` but also includes optional parameters for any child route. It accepts the route ID of any directory containing a layout, including layout-only directories that are not part of `RouteId`.

<div class="ts-block">

```dts
type LayoutParams<T extends '/' | '/my-layout' | '/my-other-layout'> = { /* generated */ };
```

</div>
