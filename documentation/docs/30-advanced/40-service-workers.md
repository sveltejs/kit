---
title: Service workers
---

Service workers act as proxy servers that handle network requests inside your app. This makes it possible to make your app work offline, but even if you don't need offline support (or can't realistically implement it because of the type of app you're building), it's often worth using service workers to speed up navigation by precaching your built JS and CSS.

In SvelteKit, if you have a `src/service-worker.js` file (or `src/service-worker.ts`, `src/service-worker/index.js`, etc.) it will be bundled and automatically registered. You can change the [location of your service worker](/docs/configuration#files) if you need to.

You can [disable automatic registration](/docs/configuration#serviceworker) if you need to register the service worker with your own logic (e.g. prompt user for update, configure periodic updates, use another solution like `workbox`, etc). The default registration looks something like this:

```js
if ('serviceWorker' in navigator) {
	addEventListener('load', function () {
		navigator.serviceWorker.register('./path/to/service-worker.js');
	});
}
```

Inside the service worker you have access to the [`$service-worker` module](/docs/modules#$service-worker), which provides you with the paths to all static assets, build files and prerendered pages. You're also provided with an app version string which you can use for creating a unique cache name. If your Vite config specifies `define` (used for global variable replacements), this will be applied to service workers as well as your server/client builds.

The following example caches all files from the build eagerly and also caches all other requests occuring later on. This would make each page work offline once visited.

```js
// @ts-nocheck Official TS Service Worker typings are still a work in progress.
import { build, files, version } from '$service-worker';

// Give the current service worker instance a unique cache name
const CACHE_NAME = `cache-${version}`;
// In this simple example, we just cache all files
const to_cache = build.concat(files);

self.addEventListener('install', (event) => {
	// Create new cache and add all files to it
	async function addFilesToCache() {
		const cache = await caches.open(CACHE_NAME);
		await cache.addAll(to_cache);
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

Because service workers need to be bundled (since browsers don't yet support `import` in this context), **SvelteKit's service workers only work in the production build, not in development**, since it depends on the client-side app's build manifest. To test it locally, use `vite preview` after running a build.

SvelteKit's service worker implementation is deliberately low-level. If you need a more full-flegded but also more opinionated solution, we recommend looking at solutions like [Vite PWA plugin](https://vite-pwa-org.netlify.app/frameworks/sveltekit.html), which uses [Workbox](https://web.dev/learn/pwa/workbox). For more general information on service workers, we recommend [the MDN web docs](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API/Using_Service_Workers).
