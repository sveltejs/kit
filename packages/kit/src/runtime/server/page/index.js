import { respond } from './respond.js';

/**
 * @param {import('types/hooks').ServerRequest} request
 * @param {import('types/internal').SSRPage} route
 * @param {RegExpExecArray} match
 * @param {import('types/internal').ComponentLoader} loader
 * @param {import('types/internal').SSRRenderOptions} options
 * @param {import('types/internal').SSRRenderState} state
 * @returns {Promise<import('types/hooks').ServerResponse | undefined>}
 */
export async function render_page(request, route, match, loader, options, state) {
	if (state.initiator === route) {
		// infinite request cycle detected
		return {
			status: 404,
			headers: {},
			body: `Not found: ${request.path}`
		};
	}

	const params = route.params(match);

	const page = {
		host: request.host,
		path: request.path,
		query: request.query,
		params
	};

	const $session = await options.hooks.getSession(request);

	const response = await respond({
		request,
		loader,
		options,
		state,
		$session,
		route,
		page
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
}
