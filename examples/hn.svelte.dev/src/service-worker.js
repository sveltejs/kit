import { build, files, timestamp } from '$service-worker';
import { precacheAndRoute, cleanupOutdatedCaches, createHandlerBoundToURL } from 'workbox-precaching';
import { NavigationRoute, registerRoute } from 'workbox-routing';
import { clientsClaim } from 'workbox-core';

/* LOGIC TO AUTO UPDATE */
self.skipWaiting();
clientsClaim();

/* LOGIC FOR PROMPT FOR UPDATE
self.addEventListener('message', (event) => {
	if (event.data && event.data.type === 'SKIP_WAITING') {
		self.skipWaiting();
	}
});
*/


precacheAndRoute([
	...build.map(f => {
		return {
			url: f,
			revision: `${timestamp}`
		};
	}),
	...files.map(f => {
		return {
			url: f,
			revision: `${timestamp}`
		};
	}),
	...['/', 'about'].map((url) => {
		return {
			url,
			revision: `${timestamp}`
		};
	})
]);

cleanupOutdatedCaches();

registerRoute(new NavigationRoute(createHandlerBoundToURL('/')));
