import { respond } from './respond.js';
import { respond_with_error } from './respond_with_error.js';

/**
 * @param {import('types/hooks').ServerRequest} request
 * @param {import('types/internal').SSRPage} route
 * @param {import('types/internal').SSRRenderOptions} options
 * @param {import('types/internal').SSRRenderState} state
 * @returns {Promise<import('types/hooks').ServerResponse>}
 */
export default async function render_page(request, route, options, state) {
	if (state.initiator === route) {
		// infinite request cycle detected
		return {
			status: 404,
			headers: {},
			body: `Not found: ${request.path}`
		};
	}

	const $session = await options.hooks.getSession(request);

	if (route) {
		const response = await respond({
			request,
			options,
			state,
			$session,
			route
		});

		if (response) {
			return response;
		}

		if (state.fetched) {
			// we came here because of a bad request in a `load` function.
			// rather than render the error page — which could lead to an
			// infinite loop, if the `load` belonged to the root layout,
			// we respond with a bare-bones 500
			return {
				status: 500,
				headers: {},
				body: `Bad request in load function: failed to fetch ${state.fetched}`
			};
		}
	} else {
		return await respond_with_error({
			request,
			options,
			state,
			$session,
			status: 404,
			error: new Error(`Not found: ${request.path}`)
		});
	}
}
