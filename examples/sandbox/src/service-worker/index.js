import { timestamp, build, assets, onInstall, onActivate, onFetch } from '$service-worker';

const name = `cache-${timestamp}`;

onInstall(async () => {
	const cache = await caches.open(name);
	cache.addAll(build);
});

onActivate(async () => {
	for (const key of await caches.keys()) {
		if (!key.includes(timestamp)) caches.delete(key);
	}
});

onFetch(async ({ request }) => {
	if (request.method !== 'GET' || request.headers.has('range')) return;

	const url = new URL(request.url);

	if (url.protocol === 'https:' || location.hostname === 'localhost') {
		const cached = await caches.match(request);

		if (url.origin === location.origin && build.includes(url.pathname)) {
			return cached;
		}

		const promise = fetch(request);

		try {
			// try the network first...
			const response = await promise;
			if (response.ok && response.type === 'basic') {
				const fallback = await caches.open(name);
				fallback.put(request, response.clone());
			}
			return response;
		} catch {
			// ...then fallback to cached response,
			// or return the failed fetch
			return cached || promise;
		}
	}
});
