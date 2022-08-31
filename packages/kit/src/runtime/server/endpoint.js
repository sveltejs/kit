import { json } from '../../exports/index.js';
import { normalize_error } from '../../utils/error.js';
import { negotiate } from '../../utils/http.js';
import { HttpError, Redirect } from '../control.js';
import { check_method_names, error_to_pojo, method_not_allowed } from './utils.js';

/**
 * @param {import('types').RequestEvent} event
 * @param {import('types').SSREndpoint} mod
 * @param {import('types').SSROptions} options
 * @param {import('types').SSRState} state
 * @returns {Promise<Response>}
 */
export async function render_endpoint(event, mod, options, state) {
	const method = /** @type {import('types').HttpMethod} */ (event.request.method);

	// TODO: Remove for 1.0
	check_method_names(mod);

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
		throw new Error(`${event.routeId} is not prerenderable`);
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
			response.headers.set('x-sveltekit-routeid', /** @type {string} */ (event.routeId));
			response.headers.set('x-sveltekit-prerender', String(prerender));
		}

		return response;
	} catch (e) {
		const error = normalize_error(e);

		if (error instanceof Redirect) {
			return new Response(undefined, {
				status: error.status,
				headers: { location: error.location }
			});
		}

		if (!(error instanceof HttpError)) {
			options.handle_error(error, event);
		}

		const wants_json =
			negotiate(event.request.headers.get('accept') || 'text/html', [
				'text/html',
				'application/json'
			]) === 'application/json';

		return wants_json
			? json(error_to_pojo(error, options.get_stack), {
					status: error instanceof HttpError ? error.status : 500
			  })
			: new Response(error.message, { status: error instanceof HttpError ? error.status : 500 });
	}
}
