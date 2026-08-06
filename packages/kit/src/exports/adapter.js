import { REROUTED_PATHNAME_HEADER } from '../runtime/shared.js';

/**
 * Returns the rerouted pathname
 * @param {Response} response
 * @param {(url: URL) => Response | Promise<Response>} next
 * @returns {Response | Promise<Response>}
 * @since 3.0.0
 */
export function applyReroute(response, next) {
	const rerouted_pathname = response.headers.get(REROUTED_PATHNAME_HEADER);
	if (!rerouted_pathname) return response;

	const url = new URL(rerouted_pathname);
	return next(url);
}
