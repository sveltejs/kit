/** @import { Span } from '@opentelemetry/api' */
/** @import { RequestEvent as Interface } from '@sveltejs/kit' */
import { RequestEvent, try_get_request_store } from './event.js';

export function get_origin() {
	// `request.url` rather than `event.url`, which throws inside queries
	const request = try_get_request_store()?.event.request;
	return request && new URL(request.url).origin;
}

/**
 * @param {Interface} event
 * @param {Span} current
 * @returns {RequestEvent}
 */
export function merge_tracing(event, current) {
	const traced = RequestEvent.from(event).clone(0);
	traced.tracing = { ...event.tracing, current };
	return traced;
}

export {
	with_request_store,
	getRequestEvent,
	get_request_store,
	try_get_request_store,
	RequestEvent,
	CONTEXT,
	QUERY,
	PRERENDER,
	FORM,
	COMMAND,
	RENDER
} from './event.js';

export { init_remote_functions } from './remote-functions.js';

export { init_tracing, otel, record_span } from './telemetry.js';

export * from '../shared.js';
