/** @import { Span } from '@opentelemetry/api' */
/** @import { RequestEvent } from '@sveltejs/kit' */
import { try_get_event } from './event.js';
import { derive_event } from './context.js';

export function get_origin() {
	// `request.url` rather than `event.url`, which throws inside queries
	const request = try_get_event()?.request;
	return request && new URL(request.url).origin;
}

/**
 * @param {RequestEvent} event
 * @param {Span} current
 * @returns {RequestEvent}
 */
export function merge_tracing(event, current) {
	return derive_event(event, null, { tracing: { ...event.tracing, current } });
}

export { with_event, getRequestEvent, get_event, try_get_event } from './event.js';

export { init_remote_functions } from './remote-functions.js';

export * from './context.js';

export { init_tracing, otel, record_span } from './telemetry.js';

export * from '../shared.js';
