import { Redirect } from '@sveltejs/kit/internal';
import { render_response } from './render.js';
import { load_data, load_server_data } from './load_data.js';
import { redirect_response } from '../utils.js';
import { handle_error_and_jsonify, static_error_page } from '../errors.js';
import { PageNodes } from '../../../utils/page_nodes.js';
import { server_data_serializer } from './data_serializer.js';

/**
 * @typedef {import('./types.js').Loaded} Loaded
 */

/**
 * @param {{
 *   event: import('@sveltejs/kit').RequestEvent;
 *   state: import('types').RequestState;
 *   options: import('types').SSROptions;
 *   manifest: import('@sveltejs/kit').SSRManifest;
 *   error: unknown;
 *   resolve_opts: import('types').RequiredResolveOptions;
 * }} opts
 */
export async function respond_with_error({ event, state, options, manifest, error, resolve_opts }) {
	// reroute to the fallback page to prevent an infinite chain of requests.
	if (event.request.headers.get('x-sveltekit-error')) {
		const transformed = await handle_error_and_jsonify(event, state, options, error);
		return static_error_page(options, transformed.status, transformed.message);
	}

	/** @type {import('./types.js').Fetched[]} */
	const fetched = [];
	try {
		const branch = [];
		const default_layout = await manifest._.nodes[0](); // 0 is always the root layout
		const nodes = new PageNodes([default_layout]);
		const ssr = nodes.ssr();
		const csr = nodes.csr();
		const data_serializer = server_data_serializer(event, state, options);
		// Do this here first in case the awaits below before rendering themselves error
		const transformed = await handle_error_and_jsonify(event, state, options, error);

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
					node: await manifest._.nodes[1](), // 1 is always the root error
					data: null,
					server_data: null
				}
			);
		}

		return await render_response({
			options,
			manifest,
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

		const transformed = await handle_error_and_jsonify(event, state, options, e);

		return static_error_page(options, transformed.status, transformed.message);
	}
}
