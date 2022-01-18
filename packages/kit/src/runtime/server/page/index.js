import { decode_params } from '../utils.js';
import { respond } from './respond.js';

/**
 * @param {import('types/hooks').RequestEvent} event
 * @param {import('types/internal').SSRPage} route
 * @param {RegExpExecArray} match
 * @param {import('types/internal').SSRRenderOptions} options
 * @param {import('types/internal').SSRRenderState} state
 * @param {boolean} ssr
 * @returns {Promise<import('types/hooks').ServerResponse | undefined>}
 */
export async function render_page(event, route, match, options, state, ssr) {
	if (state.initiator === route) {
		// infinite request cycle detected
		return {
			status: 404,
			headers: {},
			body: `Not found: ${event.url.pathname}`
		};
	}

	const params = route.params ? decode_params(route.params(match)) : {};

	const $session = await options.hooks.getSession(event);

	const response = await respond({
		event,
		options,
		state,
		$session,
		route,
		params,
		ssr
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
