/** @import { RequestEvent } from '@sveltejs/kit' */
/** @import { RequestStore } from 'types' */
/** @import { AsyncLocalStorage } from 'node:async_hooks' */

import { IN_WEBCONTAINER } from '../../runtime/server/constants.js';

/** @type {RequestStore | null} */
let sync_store = null;

/** @type {AsyncLocalStorage<RequestStore | null> | null} */
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
	return sync_store ?? als?.getStore() ?? null;
}

/**
 * @template T
 * @param {RequestStore | null} store
 * @param {() => T} fn
 */
export function with_request_store(store, fn) {
	try {
		sync_store = store;
		return als ? als.run(store, fn) : fn();
	} finally {
		// Since AsyncLocalStorage is not working in webcontainers, we don't reset `sync_store`
		// and handle only one request at a time in `src/runtime/server/index.js`.
		if (!IN_WEBCONTAINER) {
			sync_store = null;
		}
	}
}

/**
 * Sets a persistent request store for the current async context using `als.enterWith()`.
 * Unlike `with_request_store` (which scopes to a callback), this persists through
 * the remainder of the current execution — including across nested `with_request_store`
 * calls, which properly restore the outer ALS context when they complete.
 *
 * Intended for usage in test environments (e.g. called from `beforeEach`
 * in the svelteKitTest plugin setup).
 *
 * @param {RequestStore} store
 */
export function __test_set_request_store(store) {
	als?.enterWith(store);
}

/**
 * Clears the request store set by `__test_set_request_store`.
 * Intended for usage in test environments (e.g. called from `afterEach`
 * in the svelteKitTest plugin setup).
 */
export function __test_clear_request_store() {
	als?.enterWith(/** @type {any} */ (null));
}
