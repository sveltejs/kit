import { REROUTED_URL_HEADER } from '../constants.js';

/**
 * Helps a catch-all request handler pass the request to a different handler if
 * the `reroute` hook has returned a URL pathname that's different from the
 * incoming request.
 *
 * If your adapter is capable of deploying multiple serverless functions, it's a
 * good idea to also deploy a "catch-all" one to handle uncaught requests.
 * Running this in that function allows the app's `reroute` hook to rewrite
 * the request URL and invoke the next appropriate serverless function, if any.
 * @param {Response} response The response returned from the SvelteKit `server.respond` function
 * @param {(url: URL) => Response | Promise<Response>} next Your platform-specific implementation for invoking the next handler with a different request URL
 * @returns {Response | Promise<Response>}
 * @since 3.0.0
 */
export function applyReroute(response, next) {
	const rerouted_url = response.headers.get(REROUTED_URL_HEADER);
	if (!rerouted_url) return response;

	return next(new URL(rerouted_url));
}
