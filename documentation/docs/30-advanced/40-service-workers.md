---
title: Service workers
---

Service workers act as proxy servers that handle network requests inside your app. This makes it possible to make your app work offline, but even if you don't need offline support (or can't realistically implement it because of the type of app you're building), it's often worth using service workers to speed up navigation by precaching your built JS and CSS.

In SvelteKit, if you have a `src/service-worker.js` file (or `src/service-worker.ts`, `src/service-worker/index.js`, etc) it will be bundled and automatically registered. You can change the [location of your service worker](/docs/configuration#files) if you need to.

You can [disable automatic registration](/docs/configuration#serviceworker) if you need to register the service worker with your own logic or use another solution. The default registration looks something like this:

```js
if ('serviceWorker' in navigator) {
	addEventListener('load', function () {
		navigator.serviceWorker.register('./path/to/service-worker.js');
	});
}
```

Inside the service worker you have access to the [`$service-worker` module](/docs/modules#$service-worker), which provides you with the paths to all static assets, build files and prerendered pages. You're also provided with an app version string which you can use for creating a unique cache name. If your Vite config specifies `define` (used for global variable replacements), this will be applied to service workers as well as your server/client builds.

The following example caches the built app and any files in `static` eagerly, and caches all other requests as they happen. This would make each page work offline once visited.

```js
// @ts-nocheck Official TS Service Worker typings are still a work in progress.
import { build, files, version } from '$service-worker';

// Create a unique cache name for this deployment
const CACHE_NAME = `cache-${version}`;

self.addEventListener('install', (event) => {
	// Create a new cache and add all files to it
	async function addFilesToCache() {
		const cache = await caches.open(CACHE_NAME);

		await cache.addAll([
			...build, // the app itself
			...files  // everything in `static`
		]);
	}

	event.waitUntil(addFilesToCache());
});

self.addEventListener('activate', (event) => {
	// Remove previous cached data from disk
	async function deleteOldCaches() {
		const keyList = await caches.keys();
		const cachesToDelete = keyList.filter((key) => key !== CACHE_NAME);
		await Promise.all(cachesToDelete.map((key) => caches.delete(key)));
	}

	event.waitUntil(deleteOldCaches());
});

self.addEventListener('fetch', (event) => {
	// Try to get the response from the cache, add to cache if not found
	async function addToCache(request, response) {
		const cache = await caches.open(CACHE_NAME);
		await cache.put(request, response);
	}

	async function cacheFirst(request) {
		const responseFromCache = await caches.match(request);
		if (responseFromCache) {
			return responseFromCache;
		}
		const response = await fetch(request);
		addToCache(request, response.clone());
		return response;
	}

	event.respondWith(cacheFirst(event.request));
});
```

> Careful with caching too much for too long! Browsers have a limit on the amount they cache, and not everything should be cached, for example requests that contain dynamic data that change over time

The service worker is bundled for production, but not during development. For that reason, only browsers that support [modules in service workers](https://web.dev/es-modules-in-sw) will be able to use them at dev time. If you are manually registering your service worker, you will need to pass the `{ type: 'module' }` option in development:

```js
import { dev } from '$app/environment';

navigator.serviceWorker.register('/service-worker.js', {
	type: dev ? 'module' : 'classic'
});
```

> `build` and `prerendered` are empty arrays during development

SvelteKit's service worker implementation is deliberately low-level. If you need a more full-flegded but also more opinionated solution, we recommend looking at solutions like [Vite PWA plugin](https://vite-pwa-org.netlify.app/frameworks/sveltekit.html), which uses [Workbox](https://web.dev/learn/pwa/workbox). For more general information on service workers, we recommend [the MDN web docs](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API/Using_Service_Workers).
