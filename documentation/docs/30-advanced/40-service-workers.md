---
title: Service workers
---

Service workers act as proxy servers that handle network requests inside your app. This makes it possible to make your app work offline, but even if you don't need offline support (or can't realistically implement it because of the type of app you're building), it's often worth using service workers to speed up navigation by precaching your built JS and CSS.

In SvelteKit, if you have a `src/service-worker/index.ts` file it will be bundled and automatically registered.

> [!NOTE] `src/service-worker.ts` or `.js` is also valid, but see the section on [type safety](#type-safety) below

## Inside the service worker

For the service worker to do anything useful, you will likely need to import some stuff:

- [`$app/service-worker`]($app-service-worker) exports `self` which is just `globalThis` typed as [`ServiceWorkerGlobalScope`](https://developer.mozilla.org/en-US/docs/Web/API/ServiceWorkerGlobalScope) (provided you follow [these steps](#type-safety)), so that your `fetch` events are typed correctly
- [`$app/env`]($app-env) exports `version`, which is useful for creating deployment-scoped caches
- [`$app/manifest`]($app-manifest) exports `immutable` build files, your `assets`, and any `prerendered` content, allowing you to populate your caches

A typical service worker might look like this:

```js
/// file: src/service-worker.js
/// <reference no-default-lib="true"/>
/// <reference lib="esnext" />
/// <reference lib="webworker" />
// ---cut---
import { self } from '$app/service-worker';
import { version } from '$app/env';
import { immutable, assets } from '$app/manifest';

// Create a unique cache name for this deployment
const CACHE = `cache-${version}`;

const ASSETS = [
	...immutable.map((asset) => asset.path), // the Vite output
	...assets.map((asset) => asset.path)  // everything in `static`
];

self.addEventListener('install', (event) => {
	// Create a new cache and add all files to it
	async function addFilesToCache() {
		const cache = await caches.open(CACHE);
		await cache.addAll(ASSETS);
	}

	event.waitUntil(addFilesToCache());
});

self.addEventListener('activate', (event) => {
	// Remove previous cached data from disk
	async function deleteOldCaches() {
		for (const key of await caches.keys()) {
			if (key !== CACHE) await caches.delete(key);
		}
	}

	event.waitUntil(deleteOldCaches());
});

self.addEventListener('fetch', (event) => {
	// ignore POST requests etc
	if (event.request.method !== 'GET') return;

	async function respond() {
		const url = new URL(event.request.url);
		const cache = await caches.open(CACHE);

		// `immutable`/`assets` can always be served from the cache
		if (ASSETS.includes(url.pathname)) {
			const response = await cache.match(url.pathname);

			if (response) {
				return response;
			}
		}

		// for everything else, try the network first...
		try {
			const response = await fetch(event.request);

			if (response.status === 200 && !response.headers.get('cache-control')?.includes('no-store')) {
				// ...and cache responses in the background for next time....
				void cache.put(event.request, response.clone());
			}

			return response;
		} catch (error) {
			// ...otherwise fall back to previously cached data if it exists...
			const response = await cache.match(event.request);

			if (response) {
				return response;
			}

			// ...or throw the error
			throw error;
		}
	}

	event.respondWith(respond());
});
```

> [!NOTE] Be careful when caching! In some cases, stale data might be worse than data that's unavailable while offline. Since browsers will empty caches if they get too full, you should also be careful about caching large assets like video files.

## Type safety

Service workers run in a different context to the rest of your app. As such, they needs different types. You should ensure that your project's root `tsconfig.json` excludes your service worker code...

```json
/// file: tsconfig.json
{
	"extends": "$app/tsconfig",
	"includes": ["src", "test"],
	"excludes": ["src/service-worker"]
}
```

...and that your `src/service-worker/index.ts` file sits alongside a separate `tsconfig.json`, which should set up the correct types by extending [`$app/tsconfig/service-worker`]($app-tsconfig-service-worker):

```json
/// file: src/service-worker/tsconfig.json
{
	"extends": "$app/tsconfig/service-worker"
}
```

## Manual registration

You can [disable automatic registration](configuration#serviceWorker) if you need to register the service worker with your own logic. The default registration, which is injected into server-rendered HTML, looks something like this:

```js
if ('serviceWorker' in navigator) {
	const script_url = './service-worker.js';
	const policy = globalThis?.window?.trustedTypes?.createPolicy(
		'sveltekit-trusted-url',
		{ createScriptURL(url) { return url; } }
	);
	const sanitised = policy?.createScriptURL(script_url) ?? script_url;
	addEventListener('load', function () {
		navigator.serviceWorker.register(sanitised, { type: 'module' });
	});
}
```

> [!NOTE] The service worker is bundled for production, but not during development.

## Updating the service worker

Browsers check for an updated service worker when a full-page navigation happens within its scope, and after functional events such as `push` and `sync`. Client-side navigations are neither, so navigating around your app will not by itself cause a new deployment's service worker to be picked up.

SvelteKit calls [`registration.update()`](https://developer.mozilla.org/en-US/docs/Web/API/ServiceWorkerRegistration/update) only as part of error recovery — if a route module fails to load or a navigation results in an error status, and [version polling](configuration#version) detects that the app has been redeployed, the service worker is updated before SvelteKit falls back to a full-page navigation.

If you want new deployments to be picked up more eagerly, you can trigger an update check yourself — for example on every client-side navigation, in your root layout:

```js
import { afterNavigate } from '$app/navigation';

afterNavigate(async () => {
	if ('serviceWorker' in navigator) {
		const registration = await navigator.serviceWorker.getRegistration();
		await registration?.update();
	}
});
```

This will not cause the new service worker (if there is one) to take over the existing page immediately — instead, it will be installed in the background and take over as soon as the number of tabs managed by the existing service worker drops to zero.

## Other solutions

SvelteKit's service worker implementation is designed to be easy to work with and is probably a good solution for most users. However, outside of SvelteKit, many PWA applications leverage the [Workbox](https://web.dev/learn/pwa/workbox) library. If you're used to using Workbox you may prefer [Vite PWA plugin](https://vite-pwa-org.netlify.app/frameworks/sveltekit.html).

## References

For more general information on service workers, we recommend [the MDN web docs](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API/Using_Service_Workers).
