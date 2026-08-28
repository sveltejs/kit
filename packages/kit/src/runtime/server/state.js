/** @import { InternalRequestOptions, RequestState } from 'types' */

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
		read: options.read,
		before_handle: options.before_handle,
		emulator: options.emulator,
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
