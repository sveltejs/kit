/** @import { RequestEvent } from '@sveltejs/kit' */
/** @import { RequestStore } from 'types' */
/** @import { AsyncLocalStorage } from 'node:async_hooks' */

import { IN_WEBCONTAINER } from '../../runtime/server/constants.js';

/** @type {RequestStore | null} */
let sync_store = null;

/** @typedef {{ current: RequestStore | null }} RequestStoreContainer */

/** @type {AsyncLocalStorage<RequestStoreContainer | null> | null} */
let als;

import('node:async_hooks')
	.then((hooks) => (als = new hooks.AsyncLocalStorage()))
	.catch(() => {
		// can't use AsyncLocalStorage, but can still call getRequestEvent synchronously.
		// this isn't behind `supports` because it's basically just StackBlitz (i.e.
		// in-browser usage) that doesn't support it AFAICT
	});

/**
 * Returns the current `RequestEvent`. Can be used inside server hooks, server `load` functions, actions, and endpoints (and functions called by them).
 *
 * In environments without [`AsyncLocalStorage`](https://nodejs.org/api/async_context.html#class-asynclocalstorage), this must be called synchronously (i.e. not after an `await`).
 * @since 2.20.0
 *
 * @returns {RequestEvent}
 */
export function getRequestEvent() {
	const event = try_get_request_store()?.event;

	if (!event) {
		let message =
			'Can only read the current request event inside functions invoked during `handle`, such as server `load` functions, actions, endpoints, and other server hooks.';

		if (!als) {
			message +=
				' In environments without `AsyncLocalStorage`, the event must be read synchronously, not after an `await`.';
		}

		throw new Error(message);
	}

	return event;
}

export function get_request_store() {
	const result = try_get_request_store();
	if (!result) {
		let message = 'Could not get the request store.';

		if (als) {
			message += ' This is an internal error.';
		} else {
			message +=
				' In environments without `AsyncLocalStorage`, the request store (used by e.g. remote functions) must be accessed synchronously, not after an `await`.' +
				' If it was accessed synchronously then this is an internal error.';
		}

		throw new Error(message);
	}
	return result;
}

export function try_get_request_store() {
	return sync_store ?? als?.getStore()?.current ?? null;
}

/**
 * @template T
 * @param {RequestStore | null} store
 * @param {() => T} fn
 * @returns {{ result: T, dispose: () => void }}
 */
function run_with_request_store(store, fn) {
	try {
		sync_store = store;
		if (als) {
			// async resources created in `fn` capture the container, not the store, so `dispose()` nulls it to break the retention path
			const container = /** @type {RequestStoreContainer} */ ({ current: store });
			return {
				result: als.run(container, fn),
				dispose: () => {
					container.current = null;
				}
			};
		}
		return { result: fn(), dispose: () => {} };
	} finally {
		// Since AsyncLocalStorage is not working in webcontainers, we don't reset `sync_store`
		// and handle only one request at a time in `src/runtime/server/index.js`.
		if (!IN_WEBCONTAINER) {
			sync_store = null;
		}
	}
}

/**
 * @template T
 * @param {RequestStore | null} store
 * @param {() => T} fn
 * @returns {T}
 */
export function with_request_store(store, fn) {
	return run_with_request_store(store, fn).result;
}

/**
 * Like {@link with_request_store}, but also returns `dispose`, which nulls the AsyncLocalStorage
 * container so async resources created during `fn` can't retain the RequestStore. The SSR render
 * path calls `dispose()` once rendering has fully finished, including any streamed output; calling
 * it earlier, such as when the render promise settles, would sever the request context for
 * still-running async work like streamed SSR. See https://github.com/nodejs/node/issues/53408
 * @template T
 * @param {RequestStore | null} store
 * @param {() => T} fn
 * @returns {{ result: T, dispose: () => void }}
 */
export function with_request_store_disposable(store, fn) {
	return run_with_request_store(store, fn);
}
