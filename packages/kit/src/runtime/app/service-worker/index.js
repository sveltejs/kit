/** @import { SWRequestEvent } from "types" */

/** @type { SWRequestEvent | null} */
let request_event = null;

/**
 * Returns the current `RequestEvent`. Can be used inside server hooks, server `load` functions, actions, and endpoints (and functions called by them).
 *
 * In environments without [`AsyncLocalStorage`](https://nodejs.org/api/async_context.html#class-asynclocalstorage), this must be called synchronously (i.e. not after an `await`).
 * @since 2.20.0
 */
export function getRequestEvent() {
	const event = request_event;

	if (!event) {
		let message =
			'Can only read the current request event inside functions invoked during `handle`, such as server `load` functions, actions, endpoints, and other server hooks.';

		message +=
			' In environments without `AsyncLocalStorage`, the event must be read synchronously, not after an `await`.';

		throw new Error(message);
	}

	return event;
}

/**
 * @template T
 * @param {SWRequestEvent | null} event
 * @param {() => T} fn
 */
export function with_event(event, fn) {
	try {
		request_event = event;
		return fn();
	} finally {
		request_event = null;
	}
}
