import { ENDPOINT_METHODS, PAGE_METHODS } from '../../constants.js';
import { negotiate } from '../../utils/http.js';

/**
 * @param {import('types').SWRequestEvent} event
 */
export function is_endpoint_request(event) {
	const { method, headers } = event.request;

	// These methods exist exclusively for endpoints
	if (ENDPOINT_METHODS.includes(method) && !PAGE_METHODS.includes(method)) {
		return true;
	}

	// use:enhance uses a custom header to disambiguate
	if (method === 'POST' && headers.get('x-sveltekit-action') === 'true') return false;

	// GET/POST requests may be for endpoints or pages. We prefer endpoints if this isn't a text/html request
	const accept = event.request.headers.get('accept') ?? '*/*';
	return negotiate(accept, ['*', 'text/html']) !== 'text/html';
}
