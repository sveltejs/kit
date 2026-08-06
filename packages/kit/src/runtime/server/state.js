/** @import { InternalRequestOptions, RequestState, ServerHooks } from 'types' */
import { record_span } from '../telemetry/record_span.js';

/** Per-request caches and context flags — never carried into a fork. */
function transient_fields() {
	return {
		remote: {
			data: null,
			explicit: null,
			implicit: null,
			forms: null,
			requested: null,
			batches: null,
			live_iterators: null
		},
		is_in_remote_function: false,
		is_in_remote_form_or_command: false,
		is_in_remote_query: false,
		is_in_remote_prerender: false,
		is_in_render: false,
		original_event: undefined
	};
}

/**
 * @param {InternalRequestOptions} options
 * @param {ServerHooks} hooks
 * @returns {RequestState}
 */
export function create_request_state(options, hooks) {
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
		handleValidationError: hooks.handleValidationError,
		tracing: {
			record_span
		},
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
