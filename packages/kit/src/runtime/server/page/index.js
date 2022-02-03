import { render_endpoint } from '../endpoint.js';
import { respond } from './respond.js';

/**
 * @param {import('types/hooks').RequestEvent} event
 * @param {import('types/internal').SSRPage} route
 * @param {import('types/internal').SSROptions} options
 * @param {import('types/internal').SSRState} state
 * @param {boolean} ssr
 * @returns {Promise<Response | undefined>}
 */
export async function render_page(event, route, options, state, ssr) {
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
			return render_endpoint(event, await route.shadow());
		}
	}

	const $session = await options.hooks.getSession(event);

	const response = await respond({
		event,
		options,
		state,
		$session,
		route,
		params: event.params, // TODO this is redundant
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
 * @param {string} accept
 * @param {string[]} types
 */
function negotiate(accept, types) {
	const parts = accept
		.split(',')
		.map((str, i) => {
			const match = /([^/]+)\/([^;]+)(?:;q=([0-9.]+))?/.exec(str);
			if (match) {
				const [, type, subtype, q = '1'] = match;
				return { type, subtype, q: +q, i };
			}

			throw new Error(`Invalid Accept header: ${accept}`);
		})
		.sort((a, b) => {
			if (a.q !== b.q) {
				return b.q - a.q;
			}

			if ((a.subtype === '*') !== (b.subtype === '*')) {
				return a.subtype === '*' ? 1 : -1;
			}

			if ((a.type === '*') !== (b.type === '*')) {
				return a.type === '*' ? 1 : -1;
			}

			return a.i - b.i;
		});

	let accepted;
	let min_priority = Infinity;

	for (const mimetype of types) {
		const [type, subtype] = mimetype.split('/');
		const priority = parts.findIndex(
			(part) =>
				(part.type === type || part.type === '*') &&
				(part.subtype === subtype || part.subtype === '*')
		);

		if (priority !== -1 && priority < min_priority) {
			accepted = mimetype;
			min_priority = priority;
		}
	}

	return accepted;
}
