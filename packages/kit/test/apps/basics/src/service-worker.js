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

	const cached = await caches.match(request);

	if (build.includes(request.url)) {
		return cached;
	}

	if (request.url.startsWith('https:')) {
		const promise = fetch(request);

		try {
			// try the network first...
			const response = await promise;
			if (response.ok && response.type === 'basic') {
				console.log(`caching ${request.url}`);
				const fallback = await caches.open(name);
				fallback.put(request, response.clone());
			}
			console.log(`returning response from network ${request.url}`);
			return response;
		} catch {
			console.log(`handle failure ${request.url}`);
			// ...then fallback to cached response,
			// or return the failed fetch
			return cached || promise;
		}
	}
});
