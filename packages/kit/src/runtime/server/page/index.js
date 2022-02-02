import { decode_params } from '../utils.js';
import { respond } from './respond.js';

/**
 * @param {import('types/hooks').RequestEvent} event
 * @param {import('types/internal').SSRPage} route
 * @param {RegExpExecArray} match
 * @param {import('types/internal').SSROptions} options
 * @param {import('types/internal').SSRState} state
 * @param {boolean} ssr
 * @returns {Promise<Response | undefined>}
 */
export async function render_page(event, route, match, options, state, ssr) {
	if (state.initiator === route) {
		// infinite request cycle detected
		return new Response(`Not found: ${event.url.pathname}`, {
			status: 404
		});
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
		return new Response(`Bad request in load function: failed to fetch ${state.fetched}`, {
			status: 500
		});
	}
}
