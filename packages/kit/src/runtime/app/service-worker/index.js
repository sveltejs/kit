/// <reference no-default-lib="true"/>
/// <reference lib="esnext" />
/// <reference lib="webworker" />

import { DEV } from 'esm-env';

/**
 * The execution context of a service worker. This export exists to make it easier to
 * use service workers with the correct types, provided the importing module is governed
 * by a `tsconfig.json` that extends [`$app/tsconfig/service-worker`](https://svelte.dev/docs/kit/$app-tsconfig-service-worker).
 *
 */
export const self = /** @type {ServiceWorkerGlobalScope} */ (
	/** @type {unknown} */ (globalThis.self)
);

if (DEV) {
	if (
		typeof ServiceWorkerGlobalScope === 'undefined' ||
		!(self instanceof ServiceWorkerGlobalScope)
	) {
		throw new Error('The `$app/service-worker` module can only be imported into a service worker');
	}
}
