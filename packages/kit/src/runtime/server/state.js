/** @import { RequestState, ServerHooks, SSRState } from 'types' */
import { record_span } from '../telemetry/record_span.js';

/**
 * @param {SSRState} state
 * @param {ServerHooks} hooks
 * @returns {RequestState}
 */
export function create_request_state(state, hooks) {
	// Request state is rebuilt fresh, resetting remote caches and context flags.
	return {
		prerendering: state.prerendering,
		handleValidationError: hooks.handleValidationError,
		tracing: {
			record_span
		},
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
		is_in_universal_load: false
	};
}

/**
 * @param {SSRState} state
 * @returns {SSRState}
 */
export function fork_state_for_subrequest(state) {
	// Sub-requests inherit all server state except for the incremented depth.
	return { ...state, depth: state.depth + 1 };
}
