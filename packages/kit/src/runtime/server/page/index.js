import { respond } from './respond.js';
import { respond_with_error } from './respond_with_error.js';

/**
 * @param {import('types/server').ServerRequest} request
 * @param {import('types/internal').SSRPage} route
 * @param {import('types/internal').SSRRenderOptions} options
 * @returns {Promise<import('types/server').ServerResponse>}
 */
export default async function render_page(request, route, options) {
	if (options.initiator === route) {
		// infinite request cycle detected
		return {
			status: 404,
			headers: {},
			body: `Not found: ${request.path}`
		};
	}

	const $session = await options.hooks.getSession({ context: request.context });

	if (route) {
		const response = await respond({
			request,
			options,
			$session,
			route
		});

		if (response) {
			return response;
		}

		if (options.fetched) {
			// we came here because of a bad request in a `load` function.
			// rather than render the error page — which could lead to an
			// infinite loop, if the `load` belonged to the root layout,
			// we respond with a bare-bones 500
			return {
				status: 500,
				headers: {},
				body: `Bad request in load function: failed to fetch ${options.fetched}`
			};
		}
	} else {
		return await respond_with_error({
			request,
			options,
			$session,
			status: 404,
			error: new Error(`Not found: ${request.path}`)
		});
	}
}
