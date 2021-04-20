import { timestamp, build } from '$service-worker';

const name = `cache-${timestamp}`;

self.addEventListener('install', (event) => {
	// @ts-ignore
	event.waitUntil(caches.open(name).then((cache) => cache.addAll(build)));
});

self.addEventListener('activate', (event) => {
	// @ts-ignore
	event.waitUntil(
		caches.keys().then(async (keys) => {
			for (const key of keys) {
				if (!key.includes(String(timestamp))) caches.delete(key);
			}
		})
	);
});

self.addEventListener('fetch', (event) => {
	// @ts-ignore
	const { request } = event;

	if (request.method !== 'GET' || request.headers.has('range')) return;

	const url = new URL(request.url);
	const cached = caches.match(request);

	if (url.origin === location.origin && build.includes(url.pathname)) {
		// always return build files from cache
		// @ts-ignore
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
		// @ts-ignore
		event.respondWith(promise.catch(() => cached || promise));
	}
});
