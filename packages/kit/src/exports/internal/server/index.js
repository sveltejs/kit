/** @import { Span } from '@opentelemetry/api' */
import { try_get_request_store } from './event.js';

export function get_origin() {
	// `request.url` rather than `event.url`, which throws inside queries
	const request = try_get_request_store()?.event.request;
	return request && new URL(request.url).origin;
}

/**
 * @template {{ tracing: { enabled: boolean, root: Span, current: Span } }} T
 * @param {T} event_like
 * @param {Span} current
 * @returns {T}
 */
export function merge_tracing(event_like, current) {
	return {
		...event_like,
		tracing: {
			...event_like.tracing,
			current
		}
	};
}

export {
	with_request_store,
	getRequestEvent,
	get_request_store,
	try_get_request_store
} from './event.js';

export { init_remote_functions } from './remote-functions.js';

export * from '../shared.js';
