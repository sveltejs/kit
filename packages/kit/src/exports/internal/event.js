/// <reference types="zone.js" />
/** @import { RequestEvent } from '@sveltejs/kit' */
/** @import { RequestStore } from 'types' */
/** @import { AsyncLocalStorage } from 'node:async_hooks' */

import { DEV } from 'esm-env';

/** @type {RequestStore | null} */
let sync_store = null;

/** @type {AsyncLocalStorage<RequestStore | null> | null} */
let als;

let use_zone = DEV && !!process?.versions?.webcontainer;

if (use_zone) {
	// @ts-expect-error no types for zone.js/node
	import('zone.js/node').then(() => console.log('Using zone.js')).catch(() => {});
}

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
		throw new Error('Could not get the request store. This is an internal error.');
	}
	return result;
}

export function try_get_request_store() {
	if (use_zone) {
		console.log('try_get_request_store', Zone.current.name);
		/** @type {RequestStore | undefined} */
		const store = Zone.current.get('store');
		if (store) return store;
	}

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

		if (use_zone) {
			const name = Math.random().toString(36).slice(2);
			console.log('with_request_store', Zone.current.name, name);
			return Zone.current.fork({ name, properties: { store } }).run(fn);
		}

		return als ? als.run(store, fn) : fn();
	} finally {
		sync_store = null;
	}
}
