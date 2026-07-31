/** @import { RequestState, ServerHooks } from 'types' */
import { record_span } from '../telemetry/record_span.js';

/**
 * @param {Parameters<import('types').InternalServer['respond']>[1]} options
 * @param {ServerHooks} hooks
 * @returns {RequestState}
 */
export function create_request_state(options, hooks) {
	// Request state is created once for each top-level request.
	return {
		...options,
		error: false,
		depth: 0,
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
		is_in_render: false
	};
}

/**
 * @param {RequestState} state
 * @returns {RequestState}
 */
export function fork_state_for_subrequest(state) {
	// Sub-requests inherit request state while resetting caches and context flags.
	return {
		...state,
		depth: state.depth + 1,
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
