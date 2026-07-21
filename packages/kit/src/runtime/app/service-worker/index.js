/// <reference no-default-lib="true"/>
/// <reference lib="esnext" />
/// <reference lib="webworker" />

import { DEV } from 'esm-env';

export const self = /** @type {ServiceWorkerGlobalScope} */ (
	/** @type {unknown} */ (globalThis.self)
);

self.addEventListener('fetch', (e) => {
	e.respondWith;
});

if (DEV) {
	if (
		typeof ServiceWorkerGlobalScope === 'undefined' ||
		!(self instanceof ServiceWorkerGlobalScope)
	) {
		throw new Error('The `$app/service-worker` module can only be imported into a service worker');
	}
}
