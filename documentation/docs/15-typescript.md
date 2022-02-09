---
title: TypeScript
---

All APIs in SvelteKit are fully typed. Additionally, it's possible to tell SvelteKit how to type objects inside your app by declaring the `App` namespace. By default, a new project will have a file called `src/app.d.ts` containing the following:

```ts
/// <reference types="@sveltejs/kit" />

declare namespace App {
	interface Locals {}

	interface Platform {}

	interface Session {}

	interface Stuff {}
}
```

By populating these interfaces, you will gain type safety when using `event.locals`, `event.platform`, `session` and `stuff`:

### App.Locals

The interface that defines `event.locals`, which can be accessed in [hooks](/docs/hooks) (`handle`, `handleError` and `getSession`) and [endpoints](/docs/routing#endpoints).

### App.Platform

If your adapter provides [platform-specific context](/docs/adapters#supported-environments-platform-specific-context) via `event.platform`, you can specify it here.

### App.Session

The interface that defines `session`, both as an argument to [`load`](/docs/loading) functions and the value of the [session store](/docs/modules#$app-stores).

### App.Stuff

The interface that defines `stuff`, as input or output to [`load`](/docs/loading) or as the value of the `stuff` property of the [page store](/docs/modules#$app-stores).
