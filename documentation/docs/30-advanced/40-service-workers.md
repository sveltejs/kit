---
title: Service workers
---

Service workers act as proxy servers that handle network requests inside your app. This makes it possible to make your app work offline, but even if you don't need offline support (or can't realistically implement it because of the type of app you're building), it's often worth using service workers to speed up navigation by precaching your built JS and CSS.

In SvelteKit, if you have a `src/service-worker.js` file (or `src/service-worker.ts`, or `src/service-worker/index.js`, etc) it will be built with Vite and automatically registered. You can disable automatic registration if you need to register the service worker with your own logic (e.g. prompt user for update, configure periodic updates, use `workbox`, etc).

> You can change the [location of your service worker](/docs/configuration#files) and [disable automatic registration](/docs/configuration#serviceworker) in your project configuration.

Inside the service worker you have access to the [`$service-worker` module](/docs/modules#$service-worker). If your Vite config specifies `define`, this will be applied to service workers as well as your server/client builds.

The service worker is bundled for production, but not during development. For that reason, only browsers that support [modules in service workers](https://web.dev/es-modules-in-sw) will be able to use them at dev time. If you are manually registering your service worker, you will need to pass the `{ type: 'module' }` option in development:

```js
import { dev } from '$app/environment';

navigator.serviceWorker.register('/service-worker.js', {
	type: dev ? 'module' : 'classic'
});
```