import { text } from '@sveltejs/kit';
import { Redirect } from '@sveltejs/kit/internal';
import { render_response } from './render.js';
import { load_data, load_server_data } from './load_data.js';
import { redirect_response } from '../utils.js';
import { negotiate } from '../../../utils/http.js';
import { handle_error_and_jsonify } from '../errors.js';
import { PageNodes } from '../../../utils/page_nodes.js';
import { server_data_serializer } from './data_serializer.js';
import { manifest } from '../internal.js';
import { options } from '<sveltekit:generated>/server.js';
import { escape_html } from '../../../utils/escape.js';

/**
 * @typedef {import('./types.js').Loaded} Loaded
 */

/**
 * @param {{
 *   event: import('@sveltejs/kit').RequestEvent;
 *   state: import('types').RequestState;
 *   error: unknown;
 *   resolve_opts: import('types').RequiredResolveOptions;
 * }} opts
 */
export async function respond_with_error({ event, state, error, resolve_opts }) {
	// reroute to the fallback page to prevent an infinite chain of requests.
	if (event.request.headers.get('x-sveltekit-error')) {
		const transformed = await handle_error_and_jsonify(event, state, error);
		return static_error_page(transformed.status, transformed.message);
	}

	/** @type {import('./types.js').Fetched[]} */
	const fetched = [];
	try {
		const branch = [];
		const default_layout = await manifest.nodes[0](); // 0 is always the root layout
		const nodes = new PageNodes([default_layout]);
		const ssr = nodes.ssr();
		const csr = nodes.csr();
		const data_serializer = server_data_serializer(event, state);
		// Do this here first in case the awaits below before rendering themselves error
		const transformed = await handle_error_and_jsonify(event, state, error);

		if (ssr) {
			state.error = true;

			const server_data_promise = load_server_data({
				event,
				state,
				node: default_layout,
				// eslint-disable-next-line @typescript-eslint/require-await
				parent: async () => ({})
			});

			const server_data = await server_data_promise;
			data_serializer.add_node(0, server_data);

			const data = await load_data({
				event,
				state,
				fetched,
				node: default_layout,
				// eslint-disable-next-line @typescript-eslint/require-await
				parent: async () => ({}),
				resolve_opts,
				server_data_promise,
				csr
			});

			branch.push(
				{
					node: default_layout,
					server_data,
					data
				},
				{
					node: await manifest.nodes[1](), // 1 is always the root error
					data: null,
					server_data: null
				}
			);
		}

		return await render_response({
			page_config: {
				ssr,
				csr
			},
			status: transformed.status,
			error: transformed,
			branch,
			error_components: [],
			fetched,
			event,
			state,
			resolve_opts,
			data_serializer
		});
	} catch (e) {
		// Edge case: If route is a 404 and the user redirects to somewhere from the root layout,
		// we end up here.
		if (e instanceof Redirect) {
			return redirect_response(e.status, e.location);
		}

		const transformed = await handle_error_and_jsonify(event, state, e);

		return static_error_page(transformed.status, transformed.message);
	}
}

/**
 * Return as a response that renders the error.html
 *
 * @param {number} status
 * @param {string} message
 */
export function static_error_page(status, message) {
	let page = options.templates.error({ status, message: escape_html(message) });

	if (__SVELTEKIT_DEV__) {
		// inject Vite HMR client, for easier debugging
		page = page.replace('</head>', '<script type="module" src="/@vite/client"></script></head>');
	}

	return text(page, {
		headers: { 'content-type': 'text/html; charset=utf-8' },
		status
	});
}

/**
 * @param {import('@sveltejs/kit').RequestEvent} event
 * @param {import('types').RequestState} state
 * @param {unknown} error
 */
export async function handle_fatal_error(event, state, error) {
	const body = await handle_error_and_jsonify(event, state, error);
	const status = body.status;

	// sec-fetch-dest would be nicer, but non-browser clients and plain HTTP hosts don't send it
	const type = negotiate(event.request.headers.get('accept') || 'text/html', [
		'application/json',
		'text/html'
	]);

	if (event.isDataRequest || type === 'application/json') {
		return Response.json(body, {
			status
		});
	}

	return static_error_page(status, body.message);
}
