---
title: $app/types
---

This module contains generated types for the routes in your app.

```js
// @noErrors
import type { RouteId, RouteParams, LayoutParams } from '$app/types';
```

## RouteId

A union of all the route IDs in your app.

<div class="ts-block">

```dts
type RouteId = '/' | '/my-route' | '/my-other-route/[param]';
```

</div>

## RouteParams

A utility for getting the parameters associated with a given route.

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
