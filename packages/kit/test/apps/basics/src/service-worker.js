import { immutable } from '$app/manifest';
import { version } from '$app/env';
import { PUBLIC_STATIC } from '$app/env/public';

const name = `cache-${version}-${PUBLIC_STATIC}`;

self.addEventListener('install', (event) => {
	// @ts-expect-error
	event.waitUntil(caches.open(name).then((cache) => cache.addAll(immutable.map((x) => x.path))));
});

self.addEventListener('activate', (event) => {
	// @ts-expect-error
	event.waitUntil(
		caches.keys().then(async (keys) => {
			for (const key of keys) {
				if (!key.includes(version)) caches.delete(key);
			}
		})
	);
});

self.addEventListener('fetch', (event) => {
	// @ts-expect-error
	const { request } = event;

	if (request.method !== 'GET' || request.headers.has('range')) return;

	const url = new URL(request.url);
	const cached = caches.match(request);

	if (url.origin === location.origin && immutable.some((a) => url.pathname.includes(a.path))) {
		// always return build files from cache
		// @ts-expect-error
		event.respondWith(cached);
	} else if (url.protocol === 'https:' || location.hostname === 'localhost') {
		// hit the network for everything else...
		const promise = fetch(request);

		// ...and cache successful responses...
		promise.then((response) => {
			// cache successful responses
			if (response.ok && response.type === 'basic') {
				const clone = response.clone();
				caches.open(name).then((cache) => {
					cache.put(request, clone);
				});
			}
		});

		// ...but if it fails, fall back to cache if available
		// @ts-expect-error
		event.respondWith(promise.catch(() => cached || promise));
	}
});
