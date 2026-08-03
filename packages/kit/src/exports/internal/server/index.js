import { try_get_request_store } from './event.js';

export function get_origin() {
	// `request.url` rather than `event.url`, which throws inside queries
	const request = try_get_request_store()?.event.request;
	return request && new URL(request.url).origin;
}

export {
	with_request_store,
	getRequestEvent,
	get_request_store,
	try_get_request_store,
	try_get_tracing
} from './event.js';

export { init_remote_functions } from './remote-functions.js';

export * from '../shared.js';
