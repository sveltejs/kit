/** @import { RequestEvent } from '@sveltejs/kit' */
/** @import { RequestContext } from 'types' */

/** @type {RequestContext} */
const EMPTY = {};

/**
 * What kind of code the event was handed to. Lives on the event view as a non-enumerable
 * `__`, so it accumulates through `derive_event` and is dropped by a plain `{ ...event }`
 * @param {RequestEvent} event
 * @returns {RequestContext}
 */
export function get_context(event) {
	return /** @type {{ __?: RequestContext }} */ (/** @type {unknown} */ (event)).__ ?? EMPTY;
}

/**
 * @param {RequestEvent} event
 * @param {RequestContext | null} context
 * @param {Partial<RequestEvent>} [overrides]
 * @returns {RequestEvent}
 */
export function derive_event(event, context, overrides) {
	const derived = { ...event, ...overrides };
	Object.defineProperty(derived, '__', { value: { ...get_context(event), ...context } });
	return derived;
}
