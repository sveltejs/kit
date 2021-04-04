import { respond } from './respond.js';

/**
 * @param {import('types').Request} request
 * @param {import('types.internal').SSRPage} route
 * @param {import('types.internal').SSRRenderOptions} options
 * @returns {Promise<import('types').Response>}
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
			route,
			status: 200,
			error: null
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
		return await respond({
			request,
			options,
			$session,
			route,
			status: 404,
			error: new Error(`Not found: ${request.path}`)
		});
	}
}
