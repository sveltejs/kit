/** @import { RequestEvent } from '@sveltejs/kit' */
/** @import { MaybePromise, PrerenderOptions, ServerHooks, SSROptions, SSRState } from 'types' */

import { record_span } from '../telemetry/record_span.js';

export const EVENT_STATE = Symbol('remote');

/**
 * Internal state associated with the current `RequestEvent`,
 * used for tracking things like remote function calls
 * @typedef {{
 * 	prerendering: PrerenderOptions | undefined
 *  transport: ServerHooks['transport'];
 *  handleValidationError: ServerHooks['handleValidationError'];
 *  tracing: {
 *    record_span: typeof record_span
 *  }
 *  form_instances?: Map<any, any>;
 * 	remote_data?: Record<string, MaybePromise<any>>;
 *  refreshes?: Record<string, any>;
 * }} RequestEventState
 */

/**
 * @param {SSRState} state
 * @param {SSROptions} options
 * @returns {RequestEventState}
 */
export function create_event_state(state, options) {
	return {
		prerendering: state.prerendering,
		transport: options.hooks.transport,
		handleValidationError: options.hooks.handleValidationError,
		// this is necessary to avoid importing `record_span` in `sequence`, which
		// won't work because `record_span` depends on `otel`, which depends on
		// being bundled through Vite.
		tracing: {
			record_span
		}
	};
}

/**
 * Returns internal state associated with the current `RequestEvent`
 * @param {RequestEvent} event
 * @returns {RequestEventState}
 */
export function get_event_state(event) {
	// @ts-expect-error the symbol isn't exposed on the public `RequestEvent` type
	return event[EVENT_STATE];
}
