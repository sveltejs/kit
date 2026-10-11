/// <reference no-default-lib="true"/>
/// <reference lib="esnext" />
/// <reference lib="webworker" />

import { DEV } from 'esm-env';
import * as e from '../../../messages/shared-errors.js';

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
		e.service_worker_module_outside_worker();
	}
}
