import { negotiate } from '../../../utils/http.js';
import { render_endpoint } from '../endpoint.js';
import { respond } from './respond.js';

/**
 * @param {import('types').RequestEvent} event
 * @param {import('types').SSRPage} route
 * @param {import('types').SSROptions} options
 * @param {import('types').SSRState} state
 * @param {import('types').RequiredResolveOptions} resolve_opts
 * @returns {Promise<Response>}
 */
export async function render_page(event, route, options, state, resolve_opts) {
	if (state.initiator === route) {
		// infinite request cycle detected
		return new Response(`Not found: ${event.url.pathname}`, {
			status: 404
		});
	}

	if (route.shadow) {
		const type = negotiate(event.request.headers.get('accept') || 'text/html', [
			'text/html',
			'application/json'
		]);

		if (type === 'application/json') {
			return render_endpoint(event, await route.shadow(), options);
		}
	}

	const $session = await options.hooks.getSession(event);

	return respond({
		event,
		options,
		state,
		$session,
		resolve_opts,
		route
	});
}
