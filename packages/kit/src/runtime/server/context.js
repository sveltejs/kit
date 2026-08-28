/** @import { RequestEvent } from '@sveltejs/kit' */
/** @import { RequestContext } from 'types' */

const CONTEXT = Symbol('sveltekit.context');

/** @type {RequestContext} */
const EMPTY = {};

/**
 * What kind of code the event was handed to. Lives on the event view under an enumerable symbol
 * so that every `{ ...event }` copy carries it and the view keeps V8's fast object shape,
 * which `Object.defineProperty` would drop it out of
 * @param {RequestEvent} event
 * @returns {RequestContext}
 */
export function get_context(event) {
	return (
		/** @type {Record<symbol, RequestContext | undefined>} */ (/** @type {unknown} */ (event))[
			CONTEXT
		] ?? EMPTY
	);
}

/**
 * @param {RequestEvent} event
 * @param {RequestContext | null} context
 * @param {Partial<RequestEvent>} [overrides]
 * @returns {RequestEvent}
 */
export function derive_event(event, context, overrides) {
	return /** @type {RequestEvent} */ ({
		...event,
		...overrides,
		[CONTEXT]: { ...get_context(event), ...context }
	});
}
