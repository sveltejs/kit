/** @import { Span } from '@opentelemetry/api' */
import { try_get_request_store } from './event.js';

/**
 * @template {{ tracing: { enabled: boolean, root: Span, current: Span } }} T
 * @param {T} event_like
 * @param {import('@opentelemetry/api').Span} current
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

export function get_origin() {
	return try_get_request_store()?.event.url.origin;
}

export {
	with_request_store,
	getRequestEvent,
	get_request_store,
	try_get_request_store
} from './event.js';

export { init_remote_functions } from './remote-functions.js';
