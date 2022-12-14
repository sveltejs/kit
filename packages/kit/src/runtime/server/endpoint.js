import { negotiate } from '../../utils/http.js';
import { Redirect } from '../control.js';
import { method_not_allowed } from './utils.js';

/**
 * @param {import('types').RequestEvent} event
 * @param {import('types').SSREndpoint} mod
 * @param {import('types').SSRState} state
 * @returns {Promise<Response>}
 */
export async function render_endpoint(event, mod, state) {
	const method = /** @type {import('types').HttpMethod} */ (event.request.method);

	let handler = mod[method];

	if (!handler && method === 'HEAD') {
		handler = mod.GET;
	}

	if (!handler) {
		return method_not_allowed(mod, method);
	}

	const prerender = mod.prerender ?? state.prerender_default;

	if (prerender && (mod.POST || mod.PATCH || mod.PUT || mod.DELETE)) {
		throw new Error('Cannot prerender endpoints that have mutative methods');
	}

	if (state.prerendering && !prerender) {
		if (state.initiator) {
			// if request came from a prerendered page, bail
			throw new Error(`${event.route.id} is not prerenderable`);
		} else {
			// if request came direct from the crawler, signal that
			// this route cannot be prerendered, but don't bail
			return new Response(undefined, { status: 204 });
		}
	}

	try {
		const response = await handler(
			/** @type {import('types').RequestEvent<Record<string, any>>} */ (event)
		);

		if (!(response instanceof Response)) {
			throw new Error(
				`Invalid response from route ${event.url.pathname}: handler should return a Response object`
			);
		}

		if (state.prerendering) {
			response.headers.set('x-sveltekit-prerender', String(prerender));
		}

		return response;
	} catch (error) {
		if (error instanceof Redirect) {
			return new Response(undefined, {
				status: error.status,
				headers: { location: error.location }
			});
		}

		throw error;
	}
}

/**
 * @param {import('types').RequestEvent} event
 */
export function is_endpoint_request(event) {
	const { method, headers } = event.request;

	if (method === 'PUT' || method === 'PATCH' || method === 'DELETE') {
		// These methods exist exclusively for endpoints
		return true;
	}

	// use:enhance uses a custom header to disambiguate
	if (method === 'POST' && headers.get('x-sveltekit-action') === 'true') return false;

	// GET/POST requests may be for endpoints or pages. We prefer endpoints if this isn't a text/html request
	const accept = event.request.headers.get('accept') ?? '*/*';
	return negotiate(accept, ['*', 'text/html']) !== 'text/html';
}
