/** @import { RequestEvent } from '@sveltejs/kit' */
/** @import { MaybePromise, PrerenderOptions, ServerHooks, SSROptions, SSRState, RecordSpan } from 'types' */

const EVENT_STATE = Symbol('sveltekit private event state');

/**
 * Internal state associated with the current `RequestEvent`,
 * used for tracking things like remote function calls
 * @typedef {{
 * 	prerendering: PrerenderOptions | undefined
 *  transport: ServerHooks['transport'];
 *  handleValidationError: ServerHooks['handleValidationError'];
 *  tracing: {
 *    record_span: RecordSpan
 *  }
 *  form_instances?: Map<any, any>;
 * 	remote_data?: Record<string, MaybePromise<any>>;
 *  refreshes?: Record<string, any>;
 * }} RequestEventState
 */

/**
 * @param {{ event: RequestEvent, state: SSRState, options: SSROptions, record_span: RecordSpan }} args
 * @returns {RequestEvent}
 */
export function add_event_state({ event, state, options, record_span }) {
	Object.defineProperty(event, EVENT_STATE, {
		value: {
			prerendering: state.prerendering,
			transport: options.hooks.transport,
			handleValidationError: options.hooks.handleValidationError,
			// this is necessary to avoid importing `record_span` in `sequence`, which
			// won't work because `record_span` depends on `otel`, which depends on
			// being bundled through Vite.
			tracing: {
				record_span
			}
		}
	});
	return event;
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
