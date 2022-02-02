import { decode_params, is_pojo } from '../utils.js';
import { respond } from './respond.js';

/**
 * @param {import('types/hooks').RequestEvent} event
 * @param {import('types/internal').SSRPage} route
 * @param {RegExpExecArray} match
 * @param {import('types/internal').SSRRenderOptions} options
 * @param {import('types/internal').SSRRenderState} state
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
	const shadow = route.shadow ? await load_shadow_data(route.shadow, event) : {};
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

/**
 *
 * @param {(() => Promise<{ [method: string]: import('types/endpoint').ShadowRequestHandler; }>)} load
 * @param {import('types/hooks').RequestEvent} event
 */
async function load_shadow_data(load, event) {
	const mod = await load();

	const method = event.request.method.toLowerCase().replace('delete', 'del');
	const handler = mod[method];
	const get_handler = mod.get;

	if (!handler) {
		// TODO figure out what to do here. is 405 Method Not Allowed
		// appropriate, or do we fall through?
		return {};
	}

	const result = await handler(event);

	let { body = {} } = result;

	if (!is_pojo(body)) {
		throw new Error('Body returned from shadow endpoint request handler must be a plain object');
	}

	if (method !== 'get' && get_handler) {
		const get_result = await get_handler(event);
		let { body: get_body = {} } = get_result;

		body = {
			...get_body,
			...body
		};
	}

	return {
		props: body
	};
}
