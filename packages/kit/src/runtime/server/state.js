/** @import { RequestEvent } from '@sveltejs/kit' */
/** @import { InternalRequestOptions, RequestState } from 'types' */

/** Keyed by the request rather than the event, since events are copied but the request is one per request */
const states = new WeakMap();

/**
 * @param {RequestEvent} event
 * @param {RequestState} state
 */
export function set_state(event, state) {
	states.set(event.request, state);
}

/**
 * @param {RequestEvent} event
 * @returns {RequestState}
 */
export function get_state(event) {
	return /** @type {RequestState} */ (states.get(event.request));
}

/** Per-request caches — never carried into a fork. */
function transient_fields() {
	return {
		remote: {
			data: null,
			explicit: null,
			implicit: null,
			forms: null,
			requested: null,
			ignored: null,
			batches: null,
			live_iterators: null
		}
	};
}

/**
 * @param {InternalRequestOptions} options
 * @returns {RequestState}
 */
export function create_request_state(options) {
	// every field is initialized up front so the object shape stays stable
	return {
		getClientAddress: options.getClientAddress,
		platform: options.platform,
		prerendering: options.prerendering,
		prerender_default: undefined,
		error: false,
		depth: 0,
		rerouted_url: null,
		...transient_fields()
	};
}

/**
 * @param {RequestState} state
 * @returns {RequestState}
 */
export function fork_state_for_subrequest(state) {
	return {
		...state,
		...transient_fields(),
		depth: state.depth + 1
	};
}
