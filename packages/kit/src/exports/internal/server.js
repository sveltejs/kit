/**
 * @template {{ tracing: { enabled: boolean, root: import('@opentelemetry/api').Span, current: import('@opentelemetry/api').Span } }} T
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

export {
	with_request_store,
	getRequestEvent,
	get_request_store,
	try_get_request_store
} from './event.js';

export { SVELTEKIT_CACHE_CONTROL_INVALIDATE_HEADER } from '../../runtime/shared.js';
export { with_runtime_cache, RuntimeCacheStore } from '../../runtime/server/runtime-cache.js';
