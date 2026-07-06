import { try_get_request_store } from './server/event.js';

export function get_origin() {
	return try_get_request_store()?.event.url.origin;
}

export * from './shared.js';
