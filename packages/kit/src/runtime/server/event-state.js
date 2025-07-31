/** @import { RequestEvent } from '@sveltejs/kit' */
/** @import { PrerenderOptions, ServerHooks, SSROptions, SSRState } from 'types' */

export const EVENT_STATE = Symbol('remote');

/**
 * Internal state associated with the current `RequestEvent`,
 * used for tracking things like remote function calls
 * @typedef {{
 * 	prerendering: PrerenderOptions | undefined
 *  transport: ServerHooks['transport'];
 *  handleValidationError: ServerHooks['handleValidationError'];
 *  form_instances?: Map<any, any>;
 *  form_result?: [key: any, value: any];
 * 	remote_data?: Record<string, Promise<any>>;
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
		handleValidationError: options.hooks.handleValidationError
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
