/** @import { RequestEvent } from '@sveltejs/kit' */

/** @type {RequestEvent | null} */
let request_event = null;

/** @type {import('node:async_hooks').AsyncLocalStorage<RequestEvent>} */
let als;

try {
	const hooks = await import('node:async_hooks');
	als = new hooks.AsyncLocalStorage();
} catch {
	// can't use AsyncLocalStorage, but can still call getRequestEvent synchronously.
	// this isn't behind `supports` because it's basically just StackBlitz (i.e.
	// in-browser usage) that doesn't support it AFAICT
}

/**
 * Returns the current `RequestEvent`. Can be used inside `handle`, `load` and actions (and functions
 * called by them).
 *
 * In environments that do not support [`AsyncLocalStorage`](https://nodejs.org/api/async_context.html#class-asynclocalstorage), this must be called synchronously (i.e. not after an `await`).
 */
export function getRequestEvent() {
	const event = request_event ?? als?.getStore();

	if (!event) {
		throw new Error('Can only read the current request event when the event is being processed');
	}

	return event;
}

/**
 * @template T
 * @param {RequestEvent} event
 * @param {() => T} fn
 */
export function with_event(event, fn) {
	try {
		request_event = event;
		return als ? als.run(event, fn) : fn();
	} finally {
		request_event = null;
	}
}
